import type { ISODate } from "./types";

/**
 * Calendar helpers on YYYY-MM-DD strings. Dates are parsed at UTC midnight
 * and never converted to local time, so results don't depend on the server's
 * time zone. "Today" is always computed in Asia/Kolkata.
 */

const DAY_MS = 86_400_000;

export function parseISO(d: ISODate): Date {
  return new Date(`${d}T00:00:00Z`);
}

export function toISO(d: Date): ISODate {
  return d.toISOString().slice(0, 10);
}

export function todayIST(now: Date = new Date()): ISODate {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function addDays(d: ISODate, n: number): ISODate {
  return toISO(new Date(parseISO(d).getTime() + n * DAY_MS));
}

export function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((parseISO(a).getTime() - parseISO(b).getTime()) / DAY_MS);
}

export function isValidISO(d: string | undefined | null): d is ISODate {
  if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
  return toISO(parseISO(d)) === d;
}

/** Weeks start on Monday. */
export function startOfWeek(d: ISODate): ISODate {
  const dow = parseISO(d).getUTCDay(); // 0 = Sunday
  return addDays(d, -((dow + 6) % 7));
}

export function startOfMonth(d: ISODate): ISODate {
  return `${d.slice(0, 7)}-01`;
}

export function endOfMonth(d: ISODate): ISODate {
  const dt = parseISO(startOfMonth(d));
  dt.setUTCMonth(dt.getUTCMonth() + 1);
  return addDays(toISO(dt), -1);
}

export function addMonths(d: ISODate, n: number): ISODate {
  const dt = parseISO(startOfMonth(d));
  dt.setUTCMonth(dt.getUTCMonth() + n);
  return toISO(dt);
}

export function startOfYear(d: ISODate): ISODate {
  return `${d.slice(0, 4)}-01-01`;
}

export function endOfYear(d: ISODate): ISODate {
  return `${d.slice(0, 4)}-12-31`;
}

export function minDate(a: ISODate, b: ISODate): ISODate {
  return a < b ? a : b;
}

export function maxDate(a: ISODate, b: ISODate): ISODate {
  return a > b ? a : b;
}

export function eachDay(start: ISODate, end: ISODate): ISODate[] {
  const out: ISODate[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
  return out;
}

/** ISO-8601 week number, used for week pickers ("2026-W45"). */
export function isoWeek(d: ISODate): { year: number; week: number } {
  const dt = parseISO(d);
  const thursday = new Date(dt.getTime() + (3 - ((dt.getUTCDay() + 6) % 7)) * DAY_MS);
  const yearStart = Date.UTC(thursday.getUTCFullYear(), 0, 1);
  return {
    year: thursday.getUTCFullYear(),
    week: Math.ceil(((thursday.getTime() - yearStart) / DAY_MS + 1) / 7),
  };
}

export function weekStartFromISOWeek(year: number, week: number): ISODate {
  const jan4 = toISO(new Date(Date.UTC(year, 0, 4)));
  return addDays(startOfWeek(jan4), (week - 1) * 7);
}

const fmtDay = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const fmtDayShort = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
const fmtMonth = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
const fmtMonthShort = new Intl.DateTimeFormat("en-IN", { month: "short", year: "2-digit", timeZone: "UTC" });

export function formatDay(d: ISODate): string {
  return fmtDay.format(parseISO(d));
}
export function formatDayShort(d: ISODate): string {
  return fmtDayShort.format(parseISO(d));
}
export function formatMonth(d: ISODate): string {
  return fmtMonth.format(parseISO(d));
}
export function formatMonthShort(d: ISODate): string {
  return fmtMonthShort.format(parseISO(d));
}
export function formatRange(start: ISODate, end: ISODate): string {
  if (start === end) return formatDay(start);
  if (start.slice(0, 4) === end.slice(0, 4)) return `${formatDayShort(start)} – ${formatDay(end)}`;
  return `${formatDay(start)} – ${formatDay(end)}`;
}
