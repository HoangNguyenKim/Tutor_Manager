import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { CreateLessonDto, CreateRecurrenceDto, ListLessonsQuery, UpdateLessonDto } from './dto/lesson.dto';
import { LessonsRepository } from './lessons.repository';
import { expandWeekly, findOverlaps, lessonEnd, resolveWallClock } from './schedule.utils';

const DEFAULT_TZ = 'Asia/Ho_Chi_Minh';

/** Business rules: overlap, timezone, recurrence, cancel-preserves-history. */
@Injectable()
export class LessonsService {
  constructor(private readonly repo: LessonsRepository) {}

  list(query: ListLessonsQuery) {
    return this.repo.list({
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      studentId: query.studentId,
      subject: query.subject?.trim() || undefined,
      status: query.status ?? 'all',
    });
  }

  async get(id: string) {
    const lesson = await this.repo.findById(id);
    if (!lesson) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Lesson not found' });
    return lesson;
  }

  async create(dto: CreateLessonDto) {
    const start = new Date(dto.scheduledStart);
    if (Number.isNaN(start.getTime())) {
      throw new BadRequestException({ code: 'VALIDATION', message: 'Invalid scheduledStart' });
    }
    const tz = dto.timeZone?.trim() || DEFAULT_TZ;
    try {
      Intl.DateTimeFormat(undefined, { timeZone: tz });
    } catch {
      throw new BadRequestException({ code: 'VALIDATION', message: `Unknown timeZone: ${tz}` });
    }
    const end = lessonEnd(start, dto.scheduledMinutes);
    const existing = await this.repo.findActiveInRange(dto.studentId, start, end);
    const conflicts = findOverlaps(
      { start, minutes: dto.scheduledMinutes },
      existing.map((e) => ({ id: e.id, start: e.scheduledStart, minutes: e.scheduledMinutes })),
    );
    if (conflicts.length > 0) {
      throw new ConflictException({
        code: 'CONFLICT',
        message: 'Lesson overlaps an existing lesson',
        details: { conflictingIds: conflicts.map((c) => c.id) },
      });
    }
    return this.repo.create({
      student: { connect: { id: dto.studentId } },
      scheduledStart: start,
      scheduledMinutes: dto.scheduledMinutes,
      billableMinutes: dto.scheduledMinutes,
      hourlyRateVnd: dto.hourlyRateVnd ?? 0,
      tuitionVnd: dto.hourlyRateVnd ?? 0,
      timeZone: tz,
    });
  }

  async update(id: string, dto: UpdateLessonDto) {
    const lesson = await this.get(id);
    if (lesson.status !== 'scheduled') {
      throw new ConflictException({ code: 'BUSINESS_RULE', message: 'Only scheduled lessons can be rescheduled' });
    }
    const start = dto.scheduledStart ? new Date(dto.scheduledStart) : lesson.scheduledStart;
    const minutes = dto.scheduledMinutes ?? lesson.scheduledMinutes;
    const end = lessonEnd(start, minutes);
    const existing = await this.repo.findActiveInRange(lesson.studentId, start, end, id);
    const conflicts = findOverlaps(
      { start, minutes },
      existing.map((e) => ({ id: e.id, start: e.scheduledStart, minutes: e.scheduledMinutes })),
    );
    if (conflicts.length > 0) {
      throw new ConflictException({
        code: 'CONFLICT',
        message: 'Reschedule overlaps an existing lesson',
        details: { conflictingIds: conflicts.map((c) => c.id) },
      });
    }
    return this.repo.update(id, {
      ...(dto.scheduledStart ? { scheduledStart: start } : {}),
      ...(dto.scheduledMinutes !== undefined ? { scheduledMinutes: minutes, billableMinutes: minutes } : {}),
      ...(dto.timeZone ? { timeZone: dto.timeZone } : {}),
    });
  }

  /** Cancel keeps the row (status + history preserved, never deleted). */
  async cancel(id: string) {
    const lesson = await this.get(id);
    if (lesson.status === 'cancelled') return lesson;
    if (lesson.status === 'completed') {
      throw new ConflictException({ code: 'BUSINESS_RULE', message: 'Completed lessons cannot be cancelled' });
    }
    return this.repo.update(id, { status: 'cancelled' });
  }

  async createRecurrence(dto: CreateRecurrenceDto) {
    const tz = dto.timeZone?.trim() || DEFAULT_TZ;
    const from = new Date(dto.validFrom);
    const until = dto.validUntil ? new Date(dto.validUntil) : new Date(from.getTime() + 90 * 86400000);
    const [hour, minute] = dto.startTime.split(':').map(Number) as [number, number];
    const occurrences = expandWeekly(from, until, { weekday: dto.weekday, hour, minute, scheduledMinutes: dto.scheduledMinutes });
    const rule = await this.repo.createRecurrence({
      student: { connect: { id: dto.studentId } },
      weekday: dto.weekday,
      startTime: dto.startTime,
      scheduledMinutes: dto.scheduledMinutes,
      timeZone: tz,
      validFrom: from,
      validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
      hourlyRateVnd: dto.hourlyRateVnd ?? 0,
    });
    let created = 0;
    const skipped: string[] = [];
    for (const wallClock of occurrences) {
      // Re-resolve wall-clock in the zone so DST transitions keep local time stable.
      const start = resolveWallClock(wallClock, dto.startTime, tz);
      const end = lessonEnd(start, dto.scheduledMinutes);
      const existing = await this.repo.findActiveInRange(dto.studentId, start, end);
      const clashes = findOverlaps(
        { start, minutes: dto.scheduledMinutes },
        existing.map((e) => ({ id: e.id, start: e.scheduledStart, minutes: e.scheduledMinutes })),
      );
      if (clashes.length > 0) {
        skipped.push(start.toISOString());
        continue;
      }
      await this.repo.create({
        student: { connect: { id: dto.studentId } },
        scheduledStart: start,
        scheduledMinutes: dto.scheduledMinutes,
        billableMinutes: dto.scheduledMinutes,
        hourlyRateVnd: dto.hourlyRateVnd ?? 0,
        tuitionVnd: dto.hourlyRateVnd ?? 0,
        timeZone: tz,
        recurrence: { connect: { id: rule.id } },
      });
      created++;
    }
    return { rule, created, skipped };
  }
}
