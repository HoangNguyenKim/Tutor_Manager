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

  transaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>) {
    return this.prisma.$transaction(work);
  }

  findPayment(id: string, tx: Prisma.TransactionClient = this.prisma) {
    return tx.payment.findUnique({ where: { id }, include: { corrections: true } });
  }

  findByIdempotencyKey(key: string) {
    return this.prisma.payment.findUnique({ where: { idempotencyKey: key } });
  }

  async originalPaymentAmount(id: string) {
    // SQLite rowid breaks timestamp ties by insertion order, not random IDs.
    // Corrections are append-only; their first previous amount is create identity.
    const rows = await this.prisma.$queryRaw<{ previousAmountVnd: number }[]>`
      SELECT previousAmountVnd FROM PaymentCorrection
      WHERE paymentId = ${id} ORDER BY createdAt ASC, rowid ASC LIMIT 1
    `;
    return rows[0]?.previousAmountVnd;
  }

  createPayment(data: Prisma.PaymentCreateInput) {
    return this.prisma.payment.create({ data });
  }

  updatePaymentAmount(id: string, amountVnd: number, tx: Prisma.TransactionClient = this.prisma) {
    return tx.payment.update({ where: { id }, data: { amountVnd } });
  }

  createCorrection(data: Prisma.PaymentCorrectionCreateInput, tx: Prisma.TransactionClient = this.prisma) {
    return tx.paymentCorrection.create({ data });
  }

  createAdjustment(data: Prisma.TuitionAdjustmentCreateInput) {
    return this.prisma.tuitionAdjustment.create({ data });
  }

  requireStudent(id: string) {
    return this.prisma.student.findUnique({ where: { id } });
  }
}
