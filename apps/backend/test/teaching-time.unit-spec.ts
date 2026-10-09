import {
  computeBillableMinutes,
  computeBonusMinutes,
  computeTimeBreakdown,
  computeTuitionVnd,
} from '../src/lessons/schedule.utils';

describe('teaching time engine (unit)', () => {
  it('90 planned / 120 actual = 30 bonus minutes', () => {
    expect(computeBonusMinutes(90, 120)).toBe(30);
  });

  it('90 planned / 60 actual = 0 bonus minutes (early finish)', () => {
    expect(computeBonusMinutes(90, 60)).toBe(0);
  });

  it('exact finish = 0 bonus', () => {
    expect(computeBonusMinutes(90, 90)).toBe(0);
  });

  it('free bonus adds no bonus charge (actual policy)', () => {
    expect(computeBillableMinutes(90, 120, 'actual', false)).toBe(120);
  });

  it('billable bonus adds the correct amount (actual policy)', () => {
    expect(computeBillableMinutes(90, 120, 'actual', true)).toBe(150);
  });

  it('planned policy bills the plan; free bonus adds nothing', () => {
    expect(computeBillableMinutes(90, 120, 'planned', false)).toBe(90);
  });

  it('planned policy with billable bonus bills plan + bonus', () => {
    expect(computeBillableMinutes(90, 120, 'planned', true)).toBe(120);
  });

  it('early finish bills actual under actual policy', () => {
    expect(computeBillableMinutes(90, 60, 'actual', true)).toBe(60);
  });

  it('breakdown keeps all four kinds separate', () => {
    expect(computeTimeBreakdown(90, 120, 'actual', true)).toEqual({
      scheduledMinutes: 90,
      actualMinutes: 120,
      bonusMinutes: 30,
      billableMinutes: 150,
    });
  });

  it('tuition uses integer VND from the rate snapshot', () => {
    // 200000 VND/h * 150 min / 60 = 500000.
    expect(computeTuitionVnd(200000, 150)).toBe(500000);
    // 200000 * 90 / 60 = 300000.
    expect(computeTuitionVnd(200000, 90)).toBe(300000);
  });
});
