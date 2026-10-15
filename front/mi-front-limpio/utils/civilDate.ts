/**
 * Civil (date-only) helpers — timezone-safe primitives for Y-M-D strings.
 *
 * Phase 1 rule (temporal correctness): a date-only value must NEVER round-trip
 * through `toISOString()` (UTC), which silently shifts the civil day for any
 * timezone behind UTC (e.g. after 21:00 in UTC-3, "today" becomes tomorrow).
 * All helpers here operate on the device's LOCAL civil calendar.
 */

export type CivilDateParts = {
  readonly year: number;
  readonly month: number; // 1-12
  readonly day: number;
};

/** Format a local Date as a civil `YYYY-MM-DD` string. */
export function civilDateToYMD(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Today as a LOCAL civil `YYYY-MM-DD` (never UTC). */
export function todayYMD(): string {
  return civilDateToYMD(new Date());
}

const YMD_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Parse a civil `YYYY-MM-DD` into parts. Returns null for invalid values. */
export function parseCivilYMD(value: string): CivilDateParts | null {
  const match = YMD_REGEX.exec((value ?? '').trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  return { year, month, day };
}

/** Compare two civil Y-M-D strings by calendar value (not string identity). */
export function isSameCivilDate(a: string, b: string): boolean {
  const left = parseCivilYMD(a);
  const right = parseCivilYMD(b);
  if (!left || !right) return false;
  return left.year === right.year && left.month === right.month && left.day === right.day;
}
