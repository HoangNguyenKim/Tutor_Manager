import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
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
      if (existing) return { payment: existing, duplicate: true };
    }
    const payment = await this.repo.createPayment({
      student: { connect: { id: dto.studentId } },
      amountVnd: dto.amountVnd,
      paidAt: new Date(dto.paidAt),
      note: dto.note?.trim() || undefined,
      idempotencyKey: dto.idempotencyKey || undefined,
    });
    return { payment, duplicate: false };
  }

  async correctPayment(id: string, dto: CorrectPaymentDto) {
    const payment = await this.repo.findPayment(id);
    if (!payment) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Payment not found' });
    if (payment.amountVnd === dto.newAmountVnd) {
      throw new ConflictException({ code: 'BUSINESS_RULE', message: 'New amount equals current amount' });
    }
    const correction = await this.repo.createCorrection({
      payment: { connect: { id } },
      previousAmountVnd: payment.amountVnd,
      newAmountVnd: dto.newAmountVnd,
      reason: dto.reason.trim(),
    });
    const updated = await this.repo.updatePaymentAmount(id, dto.newAmountVnd);
    return { payment: updated, correction };
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
