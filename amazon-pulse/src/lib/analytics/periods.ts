import {
  addDays,
  addMonths,
  diffDays,
  endOfMonth,
  endOfYear,
  formatDay,
  formatMonth,
  formatRange,
  isValidISO,
  isoWeek,
  minDate,
  startOfMonth,
  startOfWeek,
  startOfYear,
  weekStartFromISOWeek,
} from "../dates";
import type { DateRange, Granularity, ISODate } from "../types";

export type PeriodPreset =
  | "today"
  | "yesterday"
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month"
  | "this_year"
  | "last_year"
  | "day"
  | "week"
  | "month"
  | "year"
  | "custom";

export const PRESET_LABELS: Record<Exclude<PeriodPreset, "day" | "week" | "month" | "year" | "custom">, string> = {
  today: "Today",
  yesterday: "Yesterday",
  this_week: "This week",
  last_week: "Last week",
  this_month: "This month",
  last_month: "Last month",
  this_year: "This year",
  last_year: "Last year",
};

export interface ResolvedPeriod {
  preset: PeriodPreset;
  kind: Granularity | "custom";
  label: string;
  /** Range actually analysed. Never extends beyond today. */
  range: DateRange;
  /** The full nominal period (e.g. the whole of this month), for display. */
  nominal: DateRange;
  /** True when the period is still in progress (to-date comparison). */
  inProgress: boolean;
  /** True when the whole period lies in the future. */
  future: boolean;
  compare: { label: string; range: DateRange };
  /** Best chart bucket for this period length. */
  chartGranularity: Granularity;
}

export interface PeriodParams {
  p?: string;
  d?: string;
  w?: string;
  m?: string;
  y?: string;
  from?: string;
  to?: string;
}

function chartGranularityFor(range: DateRange): Granularity {
  const len = diffDays(range.end, range.start) + 1;
  if (len <= 62) return "day";
  if (len <= 200) return "week";
  if (len <= 800) return "month";
  return "year";
}

function build(
  preset: PeriodPreset,
  kind: ResolvedPeriod["kind"],
  label: string,
  nominal: DateRange,
  today: ISODate,
  compareFor: (r: DateRange) => { label: string; range: DateRange },
): ResolvedPeriod {
  const future = nominal.start > today;
  const inProgress = !future && nominal.end > today;
  const range = { start: nominal.start, end: future ? nominal.end : minDate(nominal.end, today) };
  return {
    preset,
    kind,
    label,
    range,
    nominal,
    inProgress,
    future,
    compare: compareFor(range),
    chartGranularity: chartGranularityFor(nominal),
  };
}

/** Previous period of the same length, aligned like-for-like when in progress. */
function shiftBack(range: DateRange, days: number, label: string) {
  return { label, range: { start: addDays(range.start, -days), end: addDays(range.end, -days) } };
}

export function resolvePeriod(params: PeriodParams, today: ISODate): ResolvedPeriod {
  const preset = (params.p ?? "this_week") as PeriodPreset;

  switch (preset) {
    case "today":
    case "yesterday": {
      const d = preset === "today" ? today : addDays(today, -1);
      return build(preset, "day", PRESET_LABELS[preset], { start: d, end: d }, today, (r) =>
        shiftBack(r, 1, preset === "today" ? "Yesterday" : "Day before"),
      );
    }
    case "day": {
      const d = isValidISO(params.d) ? params.d : today;
      return build("day", "day", formatDay(d), { start: d, end: d }, today, (r) => shiftBack(r, 1, "Previous day"));
    }
    case "this_week":
    case "last_week":
    case "week": {
      let start: ISODate;
      if (preset === "week" && isValidISO(params.d)) {
        start = startOfWeek(params.d);
      } else if (preset === "week" && params.w && /^\d{4}-W\d{1,2}$/.test(params.w)) {
        const [y, w] = params.w.split("-W").map(Number);
        start = weekStartFromISOWeek(y, w);
      } else {
        start = startOfWeek(preset === "last_week" ? addDays(today, -7) : today);
      }
      const { year, week } = isoWeek(start);
      const label = preset === "week" ? `Week ${week}, ${year}` : PRESET_LABELS[preset];
      return build(preset, "week", label, { start, end: addDays(start, 6) }, today, (r) =>
        shiftBack(r, 7, r.end < addDays(r.start, 6) ? "Same days last week" : "Previous week"),
      );
    }
    case "this_month":
    case "last_month":
    case "month": {
      let start: ISODate;
      if (preset === "month" && params.m && /^\d{4}-\d{2}$/.test(params.m) && isValidISO(`${params.m}-01`)) start = `${params.m}-01`;
      else start = preset === "last_month" ? addMonths(today, -1) : startOfMonth(today);
      const label = preset === "month" ? formatMonth(start) : PRESET_LABELS[preset];
      return build(preset, "month", label, { start, end: endOfMonth(start) }, today, (r) => {
        const prevStart = addMonths(r.start, -1);
        const days = diffDays(r.end, r.start);
        const prevEnd = minDate(addDays(prevStart, days), endOfMonth(prevStart));
        const full = r.end === endOfMonth(r.start);
        return { label: full ? "Previous month" : "Same days last month", range: { start: prevStart, end: full ? endOfMonth(prevStart) : prevEnd } };
      });
    }
    case "this_year":
    case "last_year":
    case "year": {
      let y = Number(today.slice(0, 4));
      if (preset === "last_year") y -= 1;
      if (preset === "year" && params.y && /^\d{4}$/.test(params.y)) y = Number(params.y);
      const start = `${y}-01-01`;
      const label = preset === "year" ? String(y) : PRESET_LABELS[preset];
      return build(preset, "year", label, { start, end: endOfYear(start) }, today, (r) => {
        const py = y - 1;
        const full = r.end === endOfYear(r.start);
        return {
          label: full ? String(py) : `Same period ${py}`,
          range: { start: `${py}-01-01`, end: full ? `${py}-12-31` : `${py}${r.end.slice(4)}` },
        };
      });
    }
    case "custom": {
      let from = isValidISO(params.from) ? params.from : addDays(today, -29);
      let to = isValidISO(params.to) ? params.to : today;
      if (from > to) [from, to] = [to, from];
      const len = diffDays(to, from) + 1;
      return build("custom", "custom", formatRange(from, to), { start: from, end: to }, today, (r) =>
        shiftBack({ start: r.start, end: addDays(r.start, len - 1) }, len, `Previous ${len} days`),
      );
    }
    default:
      return resolvePeriod({ p: "this_week" }, today);
  }
}

export function periodToSearchParams(params: PeriodParams): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
  return sp.toString();
}

export { startOfYear };
