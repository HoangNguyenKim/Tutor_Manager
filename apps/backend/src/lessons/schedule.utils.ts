/** Pure scheduling helpers — no NestJS, no DB. Fully unit-testable. */

export interface LessonWindow {
  id?: string;
  start: Date;
  minutes: number;
}

export function lessonEnd(start: Date, minutes: number): Date {
  return new Date(start.getTime() + minutes * 60000);
}

/** True when two half-open [start, end) windows intersect. Touching edges do not overlap. */
export function windowsOverlap(a: LessonWindow, b: LessonWindow): boolean {
  return a.start.getTime() < lessonEnd(b.start, b.minutes).getTime() && b.start.getTime() < lessonEnd(a.start, a.minutes).getTime();
}

export function findOverlaps(candidate: LessonWindow, existing: LessonWindow[]): LessonWindow[] {
  return existing.filter((e) => e.id !== candidate.id && windowsOverlap(candidate, e));
}

export interface WeeklySlot {
  weekday: number; // 0=Sunday..6=Saturday (UTC weekday of the occurrence)
  hour: number;
  minute: number;
  scheduledMinutes: number;
}

/**
 * Expands a weekly wall-clock slot into UTC instants between [from, until].
 * DST-safe: arithmetic is done on UTC timestamps; callers pass the already-resolved
 * UTC hour/minute for the zone (see resolveWallClock below).
 */
export function expandWeekly(from: Date, until: Date, slot: WeeklySlot, maxCount = 500): Date[] {
  const out: Date[] = [];
  const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  const endDay = new Date(Date.UTC(until.getUTCFullYear(), until.getUTCMonth(), until.getUTCDate()));
  while (cursor <= endDay && out.length < maxCount) {
    if (cursor.getUTCDay() === slot.weekday) {
      const occurrence = new Date(
        Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), cursor.getUTCDate(), slot.hour, slot.minute),
      );
      if (occurrence >= from && occurrence <= until) out.push(occurrence);
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

/**
 * Resolves a wall-clock time (HH:mm in an IANA zone) on a given date to a UTC instant.
 * Uses Intl to find the zone offset — no date library needed.
 * `ponytail: ceiling basic zones; upgrade to Temporal API when stable in Node LTS.`
 */
export function resolveWallClock(date: Date, hhmm: string, timeZone: string): Date {
  const [h, m] = hhmm.split(':').map(Number) as [number, number];
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  // Wall-clock read as UTC; then shift by the zone offset until the zone wall-clock matches.
  const target = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), h, m);
  let guess = target;
  for (let i = 0; i < 2; i++) {
    const parts = Object.fromEntries(
      dtf.formatToParts(new Date(guess)).map((p) => [p.type, p.value]),
    );
    const asUTC = Date.UTC(
      Number(parts['year']),
      Number(parts['month']) - 1,
      Number(parts['day']),
      Number(parts['hour']) === 24 ? 0 : Number(parts['hour']),
      Number(parts['minute']),
      Number(parts['second']),
    );
    guess += target - asUTC;
  }
  return new Date(guess);
}
