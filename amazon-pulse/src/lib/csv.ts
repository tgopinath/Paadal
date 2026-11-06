/**
 * CSV import: parsing and validation. Pure functions, so the same rules run
 * in tests, in the preview and in the import itself.
 *
 * Rows are rejected rather than guessed: a row without a valid capture date
 * or ASIN is never imported, and a future date is never accepted.
 */
import { CATEGORIES } from "./categories";
import { isValidISO } from "./dates";
import type { ISODate } from "./types";

export const CSV_MAX_BYTES = 4 * 1024 * 1024;
export const CSV_MAX_ROWS = 100_000;

export interface CsvRow {
  asin: string;
  date: ISODate;
  title: string | null;
  brand: string | null;
  categoryId: string | null;
  subcategory: string | null;
  price: number | null;
  listPrice: number | null;
  rating: number | null;
  reviewCount: number | null;
  bsr: number | null;
  verifiedUnits: number | null;
}

export interface CsvIssue {
  line: number;
  message: string;
}

export interface CsvResult {
  rows: CsvRow[];
  errors: CsvIssue[];
  warnings: CsvIssue[];
  columns: string[];
  summary: { totalLines: number; validRows: number; products: number; from: ISODate | null; to: ISODate | null };
}

/** RFC 4180 parser: quoted fields, escaped quotes, CRLF/LF, optional BOM. */
export function parseCsv(text: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [];
  let field = "";
  let q = false;
  const s = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i++;
        } else q = false;
      } else field += c;
    } else if (c === '"' && field === "") q = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      row.push(field);
      out.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    out.push(row);
  }
  return out.filter((r) => r.some((f) => f.trim() !== ""));
}

const ALIASES: Record<string, string> = {
  captured_at: "captured_at",
  captured_date: "captured_at",
  date: "captured_at",
  snapshot_date: "captured_at",
  asin: "asin",
  title: "title",
  product_name: "title",
  name: "title",
  brand: "brand",
  category: "category",
  subcategory: "subcategory",
  sub_category: "subcategory",
  price: "price",
  current_price: "price",
  list_price: "list_price",
  mrp: "list_price",
  rating: "rating",
  stars: "rating",
  review_count: "review_count",
  reviews: "review_count",
  ratings_count: "review_count",
  best_sellers_rank: "best_sellers_rank",
  bsr: "best_sellers_rank",
  sales_rank: "best_sellers_rank",
  units_sold: "units_sold",
  verified_units: "units_sold",
};

const norm = (h: string) => h.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

const CATEGORY_LOOKUP = new Map<string, string>();
for (const c of CATEGORIES) {
  CATEGORY_LOOKUP.set(norm(c.id), c.id);
  CATEGORY_LOOKUP.set(norm(c.name), c.id);
}
CATEGORY_LOOKUP.set("beauty", "beauty");
CATEGORY_LOOKUP.set("home", "home-kitchen");
CATEGORY_LOOKUP.set("kitchen", "home-kitchen");
CATEGORY_LOOKUP.set("sports", "sports");
CATEGORY_LOOKUP.set("toys", "toys");
CATEGORY_LOOKUP.set("office", "office");

/** Accepts YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY (Indian day-first) and ISO timestamps. */
export function parseDate(v: string): ISODate | null {
  const t = v.trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/.exec(t);
  if (m) {
    const d = `${m[1]}-${m[2]}-${m[3]}`;
    return isValidISO(d) ? d : null;
  }
  m = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(t);
  if (m) {
    const d = `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
    return isValidISO(d) ? d : null;
  }
  return null;
}

function num(v: string | undefined): number | null | "invalid" {
  if (v == null) return null;
  const t = v.trim().replace(/^₹\s*/, "").replace(/,/g, "").replace(/^#/, "");
  if (t === "" || t === "-" || t.toLowerCase() === "na" || t.toLowerCase() === "n/a") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : "invalid";
}

export function validateCsv(text: string, today: ISODate): CsvResult {
  const errors: CsvIssue[] = [];
  const warnings: CsvIssue[] = [];
  const empty = (columns: string[] = []): CsvResult => ({ rows: [], errors, warnings, columns, summary: { totalLines: 0, validRows: 0, products: 0, from: null, to: null } });

  if (text.length > CSV_MAX_BYTES) {
    errors.push({ line: 0, message: `File is larger than ${CSV_MAX_BYTES / 1024 / 1024} MB. Split it into smaller files.` });
    return empty();
  }
  const table = parseCsv(text);
  if (table.length < 2) {
    errors.push({ line: 0, message: "The file has no data rows." });
    return empty();
  }
  const header = table[0].map((h) => ALIASES[norm(h)] ?? null);
  const columns = table[0].map((h, i) => (header[i] ? `${h.trim()} → ${header[i]}` : `${h.trim()} (ignored)`));
  const idx = (k: string) => header.indexOf(k);
  for (const req of ["captured_at", "asin"]) {
    if (idx(req) < 0) errors.push({ line: 1, message: `Missing required column "${req}".` });
  }
  if (errors.length) return empty(columns);
  if (table.length - 1 > CSV_MAX_ROWS) {
    errors.push({ line: 0, message: `Too many rows (${table.length - 1}). The limit is ${CSV_MAX_ROWS.toLocaleString("en-IN")} per file.` });
    return empty(columns);
  }

  const rows: CsvRow[] = [];
  const seen = new Map<string, number>();
  const unknownCategories = new Set<string>();
  for (let li = 1; li < table.length; li++) {
    const r = table[li];
    const line = li + 1;
    const get = (k: string) => (idx(k) >= 0 ? r[idx(k)] : undefined);
    const date = parseDate(get("captured_at") ?? "");
    if (!date) {
      errors.push({ line, message: `Missing or unreadable capture date "${get("captured_at") ?? ""}".` });
      continue;
    }
    if (date > today) {
      errors.push({ line, message: `Capture date ${date} is in the future.` });
      continue;
    }
    const asin = (get("asin") ?? "").trim().toUpperCase();
    if (!/^[A-Z0-9]{10}$/.test(asin)) {
      errors.push({ line, message: `"${asin}" is not a 10-character ASIN.` });
      continue;
    }
    const nums: Record<string, number | null> = {};
    let bad = false;
    for (const [k, lo, hi, intOnly] of [
      ["price", 0, 10_000_000, false],
      ["list_price", 0, 10_000_000, false],
      ["rating", 0, 5, false],
      ["review_count", 0, 100_000_000, true],
      ["best_sellers_rank", 1, 100_000_000, true],
      ["units_sold", 0, 100_000_000, true],
    ] as const) {
      const v = num(get(k));
      if (v === "invalid" || (v != null && (v < lo || v > hi || (intOnly && !Number.isInteger(v))))) {
        errors.push({ line, message: `Invalid ${k} "${get(k)}".` });
        bad = true;
        break;
      }
      nums[k] = v;
    }
    if (bad) continue;
    const key = `${asin}|${date}`;
    if (seen.has(key)) {
      warnings.push({ line, message: `Duplicate of line ${seen.get(key)} (${asin} on ${date}); the later row wins.` });
      rows.splice(
        rows.findIndex((x) => x.asin === asin && x.date === date),
        1,
      );
    }
    seen.set(key, line);
    const catRaw = (get("category") ?? "").trim();
    const categoryId = catRaw ? (CATEGORY_LOOKUP.get(norm(catRaw)) ?? null) : null;
    if (catRaw && !categoryId) unknownCategories.add(catRaw);
    const s = (k: string) => {
      const v = (get(k) ?? "").trim();
      return v ? v.slice(0, 500) : null;
    };
    rows.push({
      asin,
      date,
      title: s("title"),
      brand: s("brand"),
      categoryId: categoryId ?? (catRaw ? "other" : null),
      subcategory: s("subcategory"),
      price: nums.price,
      listPrice: nums.list_price,
      rating: nums.rating,
      reviewCount: nums.review_count,
      bsr: nums.best_sellers_rank,
      verifiedUnits: nums.units_sold,
    });
  }
  if (unknownCategories.size) {
    warnings.push({ line: 0, message: `Unrecognised categories filed under "Other": ${[...unknownCategories].slice(0, 5).join(", ")}${unknownCategories.size > 5 ? "…" : ""}.` });
  }
  if (idx("best_sellers_rank") < 0) {
    warnings.push({ line: 0, message: "No best_sellers_rank column: demand index and rankings can't be calculated for these rows." });
  }
  const dates = rows.map((r) => r.date).sort();
  return {
    rows,
    errors,
    warnings,
    columns,
    summary: { totalLines: table.length - 1, validRows: rows.length, products: new Set(rows.map((r) => r.asin)).size, from: dates[0] ?? null, to: dates.at(-1) ?? null },
  };
}

export function csvTemplate(): string {
  return [
    "captured_at,asin,title,brand,category,subcategory,price,list_price,rating,review_count,best_sellers_rank,units_sold",
    '2026-10-31,B0XXXXXXX1,"Stainless steel water bottle, 1L",Acme,Home & Kitchen,Water Bottles,799,1299,4.3,1532,2140,',
    "2026-11-01,B0XXXXXXX1,,,,,749,1299,4.3,1541,1985,",
  ].join("\r\n");
}
