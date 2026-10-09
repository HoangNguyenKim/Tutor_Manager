import { computeMonthlyStatement } from '../src/tuition/tuition.utils';

const lesson = (over: object) => ({
  id: 'l1',
  scheduledStart: new Date('2026-10-10T10:00:00Z'),
  subject: 'Toán',
  scheduledMinutes: 90,
  actualMinutes: 120,
  bonusMinutes: 30,
  bonusBillable: true,
  billableMinutes: 150,
  hourlyRateVnd: 200000,
  tuitionVnd: 500000,
  status: 'completed' as const,
  ...over,
});

describe('tuition engine (unit)', () => {
  it('sums completed lessons, ignores scheduled and cancelled', () => {
    const s = computeMonthlyStatement(
      's1',
      2026,
      10,
      [
        lesson({ id: 'a', tuitionVnd: 500000 }),
        lesson({ id: 'b', status: 'scheduled' as const, tuitionVnd: 999 }),
        lesson({ id: 'c', status: 'cancelled' as const, tuitionVnd: 999 }),
      ],
      [],
      [],
    );
    expect(s.lessonTotalVnd).toBe(500000);
    expect(s.lessons.map((l) => l.id)).toEqual(['a']);
  });

  it('partial payment leaves a positive balance; overpay goes negative', () => {
    const lessons = [lesson({})];
    const partial = computeMonthlyStatement('s1', 2026, 10, lessons, [], [
      { id: 'p1', amountVnd: 200000, paidAt: new Date('2026-10-11T00:00:00Z') },
    ]);
    expect(partial.amountDueVnd).toBe(500000);
    expect(partial.paidTotalVnd).toBe(200000);
    expect(partial.balanceVnd).toBe(300000);
    const over = computeMonthlyStatement('s1', 2026, 10, lessons, [], [
      { id: 'p1', amountVnd: 600000, paidAt: new Date('2026-10-11T00:00:00Z') },
    ]);
    expect(over.balanceVnd).toBe(-100000);
  });

  it('adjustments add to the amount due (discounts negative)', () => {
    const s = computeMonthlyStatement('s1', 2026, 10, [lesson({})], [{ id: 'a1', amountVnd: -50000, reason: 'Discount' }], []);
    expect(s.adjustmentTotalVnd).toBe(-50000);
    expect(s.amountDueVnd).toBe(450000);
  });

  it('only counts rows in the requested month', () => {
    const s = computeMonthlyStatement(
      's1',
      2026,
      10,
      [lesson({ scheduledStart: new Date('2026-11-01T00:00:00Z') })],
      [],
      [{ id: 'p1', amountVnd: 999, paidAt: new Date('2026-11-01T00:00:00Z') }],
    );
    expect(s.lessonTotalVnd).toBe(0);
    expect(s.paidTotalVnd).toBe(0);
    expect(s.balanceVnd).toBe(0);
  });
});
