import { Injectable, NotFoundException } from '@nestjs/common';
import { ReportsRepository } from './reports.repository';

export interface RangeInput {
  from?: Date;
  to?: Date;
}

function startOfWeek(d = new Date()): Date {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfWeek(d = new Date()): Date {
  const s = startOfWeek(d);
  const e = new Date(s);
  e.setDate(e.getDate() + 6);
  e.setHours(23, 59, 59, 999);
  return e;
}

function startOfMonth(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function resolveRange(preset?: string, from?: string, to?: string): { from: Date; to: Date } {
  if (preset === 'week') return { from: startOfWeek(), to: endOfWeek() };
  if (preset === 'month' || !from || !to) return { from: startOfMonth(), to: endOfMonth() };
  return { from: new Date(from), to: new Date(to) };
}

/** Aggregates real SQLite rows — no mock data, integer VND throughout. */
@Injectable()
export class ReportsService {
  constructor(private readonly repo: ReportsRepository) {}

  async overview(preset?: string, from?: string, to?: string) {
    const range = resolveRange(preset, from, to);
    const [activeStudents, lessons, payments, adjustments, upcoming] = await Promise.all([
      this.repo.activeStudents(),
      this.repo.lessonsInRange(range.from, range.to),
      this.repo.paymentsInRange(range.from, range.to),
      this.repo.adjustmentsInRange(range.from, range.to),
      this.repo.upcomingLessons(),
    ]);
    const completed = lessons.filter((l) => l.status === 'completed');
    const scheduled = lessons.filter((l) => l.status === 'scheduled');
    const sum = (ns: number[]) => ns.reduce((a, b) => a + b, 0);
    const plannedMinutes = sum(completed.map((l) => l.scheduledMinutes));
    const actualMinutes = sum(completed.map((l) => l.actualMinutes ?? 0));
    const bonusMinutes = sum(completed.map((l) => l.bonusMinutes));
    const billableMinutes = sum(completed.map((l) => l.billableMinutes));
    const tuitionVnd = sum(completed.map((l) => l.tuitionVnd));
    const adjustmentVnd = sum(adjustments.map((a) => a.amountVnd));
    const collectedVnd = sum(payments.map((p) => p.amountVnd));
    return {
      range,
      activeStudents,
      scheduledLessons: scheduled.length,
      completedLessons: completed.length,
      plannedMinutes,
      actualMinutes,
      bonusMinutes,
      billableMinutes,
      tuitionVnd: tuitionVnd + adjustmentVnd,
      collectedVnd,
      outstandingVnd: tuitionVnd + adjustmentVnd - collectedVnd,
      upcoming: upcoming.map((l) => ({
        id: l.id,
        studentId: l.studentId,
        studentName: l.student.name,
        subject: l.subject,
        scheduledStart: l.scheduledStart,
        scheduledMinutes: l.scheduledMinutes,
      })),
    };
  }

  async studentHistory(studentId: string, from?: string, to?: string) {
    const [lessons, payments, adjustments] = await Promise.all([
      this.repo.studentHistory(studentId, from ? new Date(from) : undefined, to ? new Date(to) : undefined),
      this.repo.studentPayments(studentId, from ? new Date(from) : undefined, to ? new Date(to) : undefined),
      this.repo.studentAdjustments(studentId, from ? new Date(from) : undefined, to ? new Date(to) : undefined),
    ]);
    return { lessons, payments, adjustments };
  }

  async monthlySummary(year: number, month: number) {
    const from = new Date(year, month - 1, 1);
    const to = new Date(year, month, 0, 23, 59, 59, 999);
    const [lessons, payments, adjustments] = await Promise.all([
      this.repo.lessonsInRange(from, to),
      this.repo.paymentsInRange(from, to),
      this.repo.adjustmentsInRange(from, to),
    ]);
    const completed = lessons.filter((l) => l.status === 'completed');
    const byStudent = new Map<string, { studentId: string; studentName: string; lessons: number; minutes: number; tuitionVnd: number; paidVnd: number }>();
    for (const l of completed) {
      const e = byStudent.get(l.studentId) ?? { studentId: l.studentId, studentName: l.student.name, lessons: 0, minutes: 0, tuitionVnd: 0, paidVnd: 0 };
      e.lessons += 1;
      e.minutes += l.billableMinutes;
      e.tuitionVnd += l.tuitionVnd;
      byStudent.set(l.studentId, e);
    }
    for (const p of payments) {
      const e = byStudent.get(p.studentId) ?? { studentId: p.studentId, studentName: p.student.name, lessons: 0, minutes: 0, tuitionVnd: 0, paidVnd: 0 };
      e.paidVnd += p.amountVnd;
      byStudent.set(p.studentId, e);
    }
    return {
      year,
      month,
      students: [...byStudent.values()],
      totals: {
        lessons: completed.length,
        tuitionVnd: completed.reduce((a, l) => a + l.tuitionVnd, 0) + adjustments.reduce((a, x) => a + x.amountVnd, 0),
        collectedVnd: payments.reduce((a, p) => a + p.amountVnd, 0),
      },
    };
  }

  async bonusSummary(from?: string, to?: string) {
    const range = from && to ? { from: new Date(from), to: new Date(to) } : resolveRange('month');
    const lessons = await this.repo.lessonsInRange(range.from, range.to);
    const completed = lessons.filter((l) => l.status === 'completed' && l.bonusMinutes > 0);
    const byStudent = new Map<string, { studentId: string; studentName: string; bonusMinutes: number; billableBonusMinutes: number }>();
    for (const l of completed) {
      const e = byStudent.get(l.studentId) ?? { studentId: l.studentId, studentName: l.student.name, bonusMinutes: 0, billableBonusMinutes: 0 };
      e.bonusMinutes += l.bonusMinutes;
      if (l.bonusBillable) e.billableBonusMinutes += l.bonusMinutes;
      byStudent.set(l.studentId, e);
    }
    return { range, students: [...byStudent.values()] };
  }

  async paymentHistory(from?: string, to?: string) {
    const range = from && to ? { from: new Date(from), to: new Date(to) } : resolveRange('month');
    const payments = await this.repo.paymentsInRange(range.from, range.to);
    return {
      range,
      payments: payments.map((p) => ({
        id: p.id,
        studentId: p.studentId,
        studentName: p.student.name,
        amountVnd: p.amountVnd,
        paidAt: p.paidAt,
        note: p.note,
      })),
      totalVnd: payments.reduce((a, p) => a + p.amountVnd, 0),
    };
  }

  async requireStudent(studentId: string) {
    const history = await this.studentHistory(studentId);
    if (history.lessons.length === 0) {
      const payments = await this.repo.studentPayments(studentId);
      if (payments.length === 0) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Student not found' });
    }
    return history;
  }
}
