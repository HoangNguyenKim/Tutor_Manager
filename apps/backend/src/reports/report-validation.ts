import { BadRequestException } from '@nestjs/common';
import { isISO8601 } from 'class-validator';

/** Reports support calendar years 1900–9999 (inclusive), for dates and monthly queries. */
export const REPORT_MIN_YEAR = 1900;
export const REPORT_MAX_YEAR = 9999;

/** Accept integer API query strings only; numeric service callers use the same bounds. */
export function validateReportMonth(year: unknown, month: unknown): { year: number; month: number } {
  const isIntegerInput = (value: unknown) => typeof value === 'number'
    ? Number.isInteger(value)
    : typeof value === 'string' && /^\d+$/.test(value);
  const y = Number(year);
  const m = Number(month);
  if (!isIntegerInput(year) || !isIntegerInput(month)
    || !Number.isInteger(y) || y < REPORT_MIN_YEAR || y > REPORT_MAX_YEAR
    || !Number.isInteger(m) || m < 1 || m > 12) {
    throw new BadRequestException({ code: 'VALIDATION', message: 'year must be 1900–9999 and month must be 1–12 (integers)' });
  }
  return { year: y, month: m };
}

function invalidRange(): never {
  throw new BadRequestException({
    code: 'VALIDATION',
    message: 'from/to must both be valid ISO dates in years 1900–9999, with from not after to',
  });
}

function parseReportDate(value: unknown): Date {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value)
    || !isISO8601(value, { strict: true, strictSeparator: true })) invalidRange();
  const year = Number(value.slice(0, 4));
  const date = new Date(value);
  if (year < REPORT_MIN_YEAR || year > REPORT_MAX_YEAR || !Number.isFinite(date.getTime())) invalidRange();
  return date;
}

/** Omitted pairs remain unfiltered; a supplied pair must be complete and ordered. */
export function validateReportRange(from?: string, to?: string): { from: Date; to: Date } | undefined {
  if (from === undefined && to === undefined) return undefined;
  const range = { from: parseReportDate(from), to: parseReportDate(to) };
  if (range.from > range.to) invalidRange();
  return range;
}
