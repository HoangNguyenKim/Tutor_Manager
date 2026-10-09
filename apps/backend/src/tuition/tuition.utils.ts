/** Pure tuition math — no NestJS, no DB. Integer VND throughout. */

export interface StatementLesson {
  id: string;
  scheduledStart: Date;
  subject: string;
  scheduledMinutes: number;
  actualMinutes: number | null;
  bonusMinutes: number;
  bonusBillable: boolean;
  billableMinutes: number;
  hourlyRateVnd: number;
  tuitionVnd: number;
  status: 'scheduled' | 'completed' | 'cancelled';
}

export interface StatementAdjustment {
  id: string;
  amountVnd: number;
  reason: string;
}

export interface StatementPayment {
  id: string;
  amountVnd: number;
  paidAt: Date;
}

export interface MonthlyStatement {
  studentId: string;
  year: number;
  month: number;
  lessons: StatementLesson[];
  lessonTotalVnd: number;
  adjustments: StatementAdjustment[];
  adjustmentTotalVnd: number;
  amountDueVnd: number;
  payments: StatementPayment[];
  paidTotalVnd: number;
  /** Positive = owes; negative = overpaid. */
  balanceVnd: number;
}

/**
 * Billing policy: tuition = sum of completed-lesson snapshots + adjustments.
 * Cancelled and scheduled lessons never affect tuition. Rounding happens once
 * per lesson at completion (computeTuitionVnd) — statements only add integers.
 */
export function computeMonthlyStatement(
  studentId: string,
  year: number,
  month: number,
  lessons: StatementLesson[],
  adjustments: StatementAdjustment[],
  payments: StatementPayment[],
): MonthlyStatement {
  const inMonth = (d: Date) => d.getUTCFullYear() === year && d.getUTCMonth() + 1 === month;
  const billed = lessons.filter((l) => l.status === 'completed' && inMonth(l.scheduledStart));
  const lessonTotalVnd = billed.reduce((sum, l) => sum + l.tuitionVnd, 0);
  const adjustmentTotalVnd = adjustments.reduce((sum, a) => sum + a.amountVnd, 0);
  const amountDueVnd = lessonTotalVnd + adjustmentTotalVnd;
  const paidTotalVnd = payments.filter((p) => inMonth(p.paidAt)).reduce((sum, p) => sum + p.amountVnd, 0);
  return {
    studentId,
    year,
    month,
    lessons: billed,
    lessonTotalVnd,
    adjustments,
    adjustmentTotalVnd,
    amountDueVnd,
    payments: payments.filter((p) => inMonth(p.paidAt)),
    paidTotalVnd,
    balanceVnd: amountDueVnd - paidTotalVnd,
  };
}
