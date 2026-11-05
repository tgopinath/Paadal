const inr0 = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const inr2 = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const int = new Intl.NumberFormat("en-IN");
const compact = new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 });

export function formatINR(x: number | null | undefined, precise = false): string {
  if (x == null || !Number.isFinite(x)) return "—";
  return (precise ? inr2 : inr0).format(x);
}

export function formatInt(x: number | null | undefined): string {
  if (x == null || !Number.isFinite(x)) return "—";
  return int.format(Math.round(x));
}

export function formatCompact(x: number | null | undefined): string {
  if (x == null || !Number.isFinite(x)) return "—";
  return compact.format(x);
}

export function formatPct(x: number | null | undefined, digits = 1, signed = true): string {
  if (x == null || !Number.isFinite(x)) return "—";
  const s = x.toFixed(digits);
  return `${signed && x > 0 ? "+" : ""}${s}%`;
}

export function formatIndex(x: number | null | undefined): string {
  if (x == null || !Number.isFinite(x)) return "—";
  return x.toFixed(1);
}

export function formatSigned(x: number | null | undefined, digits = 1): string {
  if (x == null || !Number.isFinite(x)) return "—";
  return `${x > 0 ? "+" : ""}${x.toFixed(digits)}`;
}
