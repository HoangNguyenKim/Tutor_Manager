import { Injectable } from '@nestjs/common';
import type { LessonStatus, Prisma } from '../generated/prisma/client';
import { PrismaService } from '../db/prisma.service';

export interface LessonListFilter {
  from?: Date;
  to?: Date;
  studentId?: string;
  subject?: string;
  status?: LessonStatus | 'all';
}

/** SQL only — no business rules here. */
@Injectable()
export class LessonsRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(filter: LessonListFilter) {
    const where: Prisma.LessonWhereInput = {};
    if (filter.from || filter.to) {
      where.scheduledStart = {
        ...(filter.from ? { gte: filter.from } : {}),
        ...(filter.to ? { lte: filter.to } : {}),
      };
    }
    if (filter.studentId) where.studentId = filter.studentId;
    if (filter.subject) where.subject = filter.subject;
    if (filter.status && filter.status !== 'all') where.status = filter.status;
    return this.prisma.lesson.findMany({
      where,
      include: { student: { select: { id: true, name: true } } },
      orderBy: { scheduledStart: 'asc' },
      take: 500,
    });
  }

  findById(id: string) {
    return this.prisma.lesson.findUnique({ where: { id }, include: { student: true } });
  }

  /** Active (non-cancelled, non-deleted) lessons of a student intersecting [from, to). */
  findActiveInRange(studentId: string, from: Date, to: Date, excludeId?: string) {
    return this.prisma.lesson.findMany({
      where: {
        studentId,
        status: { not: 'cancelled' },
        deletedAt: null,
        ...(excludeId ? { id: { not: excludeId } } : {}),
        scheduledStart: { lt: to },
      },
    });
  }

  create(data: Prisma.LessonCreateInput) {
    return this.prisma.lesson.create({ data });
  }

  update(id: string, data: Prisma.LessonUpdateInput) {
    return this.prisma.lesson.update({ where: { id }, data });
  }

  createRecurrence(data: Prisma.RecurrenceRuleCreateInput) {
    return this.prisma.recurrenceRule.create({ data });
  }
}
