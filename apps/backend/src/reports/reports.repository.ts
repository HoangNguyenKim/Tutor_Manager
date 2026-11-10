import { Injectable } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';

/** SQL only — range-scoped aggregates, no business rules here. */
@Injectable()
export class ReportsRepository {
  constructor(private readonly prisma: PrismaService) {}

  activeStudents() {
    return this.prisma.student.count({ where: { isActive: true } });
  }

  lessonsInRange(from: Date, to: Date) {
    return this.prisma.lesson.findMany({
      where: { scheduledStart: { gte: from, lte: to } },
      include: { student: { select: { id: true, name: true } } },
      orderBy: { scheduledStart: 'asc' },
      take: 2000,
    });
  }

  upcomingLessons(limit = 10) {
    return this.prisma.lesson.findMany({
      where: { status: 'scheduled', scheduledStart: { gte: new Date() } },
      include: { student: { select: { id: true, name: true } } },
      orderBy: { scheduledStart: 'asc' },
      take: limit,
    });
  }

  paymentsInRange(from: Date, to: Date) {
    return this.prisma.payment.findMany({
      where: { paidAt: { gte: from, lte: to } },
      include: { student: { select: { id: true, name: true } } },
      orderBy: { paidAt: 'asc' },
      take: 2000,
    });
  }

  adjustmentsInRange(from: Date, to: Date) {
    return this.prisma.tuitionAdjustment.findMany({
      where: { createdAt: { gte: from, lte: to } },
      include: { student: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' },
      take: 2000,
    });
  }

  studentHistory(studentId: string, from?: Date, to?: Date) {
    const range =
      from || to
        ? { scheduledStart: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
        : {};
    return this.prisma.lesson.findMany({
      where: { studentId, ...range },
      orderBy: { scheduledStart: 'asc' },
      take: 2000,
    });
  }

  studentPayments(studentId: string, from?: Date, to?: Date) {
    const range = from || to ? { paidAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {};
    return this.prisma.payment.findMany({
      where: { studentId, ...range },
      orderBy: { paidAt: 'asc' },
      take: 2000,
    });
  }

  studentAdjustments(studentId: string, from?: Date, to?: Date) {
    const range =
      from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {};
    return this.prisma.tuitionAdjustment.findMany({
      where: { studentId, ...range },
      orderBy: { createdAt: 'asc' },
      take: 2000,
    });
  }
}
