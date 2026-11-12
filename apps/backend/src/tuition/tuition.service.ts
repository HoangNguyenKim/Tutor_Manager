import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type Payment } from '../generated/prisma/client';
import { computeMonthlyStatement } from './tuition.utils';
import { TuitionRepository } from './tuition.repository';
import type { CorrectPaymentDto, CreateAdjustmentDto, CreatePaymentDto } from './dto/tuition.dto';

/** Business rules: statements from snapshots, idempotent payments, audited corrections. */
@Injectable()
export class TuitionService {
  constructor(private readonly repo: TuitionRepository) {}

  async statement(studentId: string, year: number, month: number) {
    await this.requireStudent(studentId);
    const [lessons, adjustments, payments] = await Promise.all([
      this.repo.completedLessons(studentId),
      this.repo.adjustments(studentId),
      this.repo.payments(studentId),
    ]);
    return computeMonthlyStatement(
      studentId,
      year,
      month,
      lessons.map((l) => ({
        id: l.id,
        scheduledStart: l.scheduledStart,
        subject: l.subject,
        scheduledMinutes: l.scheduledMinutes,
        actualMinutes: l.actualMinutes,
        bonusMinutes: l.bonusMinutes,
        bonusBillable: l.bonusBillable,
        billableMinutes: l.billableMinutes,
        hourlyRateVnd: l.hourlyRateVnd,
        tuitionVnd: l.tuitionVnd,
        status: l.status,
      })),
      adjustments,
      payments,
    );
  }

  async listPayments(studentId: string) {
    await this.requireStudent(studentId);
    return this.repo.payments(studentId);
  }

  async createPayment(dto: CreatePaymentDto) {
    await this.requireStudent(dto.studentId);
    if (dto.idempotencyKey) {
      const existing = await this.repo.findByIdempotencyKey(dto.idempotencyKey);
      if (existing) return this.duplicatePayment(existing, dto);
    }
    try {
      const payment = await this.repo.createPayment({
        student: { connect: { id: dto.studentId } },
        amountVnd: dto.amountVnd,
        paidAt: new Date(dto.paidAt),
        note: dto.note?.trim() || undefined,
        idempotencyKey: dto.idempotencyKey || undefined,
      });
      return { payment, duplicate: false };
    } catch (error) {
      // A competing request can insert after our absent-key lookup.
      // Only recover a unique collision if the keyed winner actually exists.
      if (dto.idempotencyKey && error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const existing = await this.repo.findByIdempotencyKey(dto.idempotencyKey);
        if (existing) return this.duplicatePayment(existing, dto);
      }
      throw error;
    }
  }

  private async duplicatePayment(existing: Payment, dto: CreatePaymentDto) {
    const originalAmount = await this.repo.originalPaymentAmount(existing.id) ?? existing.amountVnd;
    if (existing.studentId !== dto.studentId || originalAmount !== dto.amountVnd ||
        existing.paidAt.getTime() !== new Date(dto.paidAt).getTime() ||
        (existing.note ?? '') !== (dto.note?.trim() ?? '')) {
      throw new ConflictException({ code: 'CONFLICT', message: 'Idempotency key already used for a different payment' });
    }
    return { payment: existing, duplicate: true };
  }

  async correctPayment(id: string, dto: CorrectPaymentDto) {
    return this.repo.transaction(async (tx) => {
      const payment = await this.repo.findPayment(id, tx);
      if (!payment) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Payment not found' });
      if (payment.amountVnd === dto.newAmountVnd) {
        throw new ConflictException({ code: 'BUSINESS_RULE', message: 'New amount equals current amount' });
      }
      const correction = await this.repo.createCorrection({
        payment: { connect: { id } },
        previousAmountVnd: payment.amountVnd,
        newAmountVnd: dto.newAmountVnd,
        reason: dto.reason.trim(),
      }, tx);
      const updated = await this.repo.updatePaymentAmount(id, dto.newAmountVnd, tx);
      return { payment: updated, correction };
    });
  }

  async createAdjustment(dto: CreateAdjustmentDto) {
    await this.requireStudent(dto.studentId);
    return this.repo.createAdjustment({
      student: { connect: { id: dto.studentId } },
      amountVnd: dto.amountVnd,
      reason: dto.reason.trim(),
    });
  }

  private async requireStudent(id: string) {
    const student = await this.repo.requireStudent(id);
    if (!student) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Student not found' });
    return student;
  }
}
