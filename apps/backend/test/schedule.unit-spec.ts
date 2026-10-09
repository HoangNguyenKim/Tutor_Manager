import { expandWeekly, findOverlaps, resolveWallClock, windowsOverlap } from '../src/lessons/schedule.utils';

describe('schedule.utils (unit)', () => {
  it('detects overlap but not touching edges', () => {
    const a = { start: new Date('2026-10-12T10:00:00Z'), minutes: 60 };
    expect(windowsOverlap(a, { start: new Date('2026-10-12T10:30:00Z'), minutes: 60 })).toBe(true);
    expect(windowsOverlap(a, { start: new Date('2026-10-12T11:00:00Z'), minutes: 60 })).toBe(false);
    expect(windowsOverlap(a, { start: new Date('2026-10-12T09:00:00Z'), minutes: 60 })).toBe(false);
  });

  it('findOverlaps ignores the candidate itself', () => {
    const existing = [
      { id: 'e1', start: new Date('2026-10-12T10:30:00Z'), minutes: 60 },
      { id: 'self', start: new Date('2026-10-12T10:00:00Z'), minutes: 60 },
    ];
    const out = findOverlaps({ id: 'self', start: new Date('2026-10-12T10:00:00Z'), minutes: 60 }, existing);
    expect(out.map((o) => o.id)).toEqual(['e1']);
  });

  it('expands weekly occurrences within range', () => {
    // 2026-10-12 is a Monday.
    const out = expandWeekly(new Date('2026-10-12T00:00:00Z'), new Date('2026-10-26T23:59:59Z'), {
      weekday: 1,
      hour: 10,
      minute: 0,
      scheduledMinutes: 60,
    });
    expect(out.map((d) => d.toISOString())).toEqual([
      '2026-10-12T10:00:00.000Z',
      '2026-10-19T10:00:00.000Z',
      '2026-10-26T10:00:00.000Z',
    ]);
  });

  it('resolves wall-clock consistently (UTC round-trip)', () => {
    const start = resolveWallClock(new Date('2026-10-12T00:00:00Z'), '17:00', 'Asia/Ho_Chi_Minh');
    expect(start.toISOString()).toBe('2026-10-12T10:00:00.000Z');
  });
});
