import { Injectable } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../db/prisma.service';

/** SQL only — no business rules here. */
@Injectable()
export class TuitionRepository {
  constructor(private readonly prisma: PrismaService) {}

  completedLessons(studentId: string) {
    return this.prisma.lesson.findMany({
      where: { studentId, status: 'completed' },
      orderBy: { scheduledStart: 'asc' },
    });
  }

  adjustments(studentId: string) {
    return this.prisma.tuitionAdjustment.findMany({
      where: { studentId },
      orderBy: { createdAt: 'asc' },
    });
  }

  payments(studentId: string) {
    return this.prisma.payment.findMany({
      where: { studentId },
      orderBy: { paidAt: 'asc' },
      include: { corrections: { orderBy: { createdAt: 'asc' } } },
    });
  }

  findPayment(id: string) {
    return this.prisma.payment.findUnique({ where: { id }, include: { corrections: true } });
  }

  findByIdempotencyKey(key: string) {
    return this.prisma.payment.findUnique({ where: { idempotencyKey: key } });
  }

  createPayment(data: Prisma.PaymentCreateInput) {
    return this.prisma.payment.create({ data });
  }

  updatePaymentAmount(id: string, amountVnd: number) {
    return this.prisma.payment.update({ where: { id }, data: { amountVnd } });
  }

  createCorrection(data: Prisma.PaymentCorrectionCreateInput) {
    return this.prisma.paymentCorrection.create({ data });
  }

  createAdjustment(data: Prisma.TuitionAdjustmentCreateInput) {
    return this.prisma.tuitionAdjustment.create({ data });
  }

  requireStudent(id: string) {
    return this.prisma.student.findUnique({ where: { id } });
  }
}
