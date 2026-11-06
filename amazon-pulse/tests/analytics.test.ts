import { test } from "node:test";
import assert from "node:assert/strict";
import { resolvePeriod } from "../src/lib/analytics/periods";
import { calculateProfit } from "../src/lib/analytics/profit";
import { bsrToDemandIndex } from "../src/lib/analytics/demand";
import { coverage, periodReport, rankProducts, trendScore, type Dataset } from "../src/lib/analytics/engine";
import { reportToCSV } from "../src/lib/reports";
import { generateDemoDataset, DEMO_HISTORY_START, DEMO_OUTAGE } from "../src/lib/data/demo-generator";
import { addDays } from "../src/lib/dates";
import type { Snapshot } from "../src/lib/types";

const TODAY = "2026-11-05"; // a Thursday

test("this week runs Monday to today and compares like-for-like", () => {
  const p = resolvePeriod({ p: "this_week" }, TODAY);
  assert.deepEqual(p.range, { start: "2026-11-02", end: "2026-11-05" });
  assert.deepEqual(p.compare.range, { start: "2026-10-26", end: "2026-10-29" });
  assert.equal(p.compare.label, "Same days last week");
  assert.ok(p.inProgress);
});

test("a completed month compares with the whole previous month", () => {
  const p = resolvePeriod({ p: "month", m: "2026-03" }, TODAY);
  assert.deepEqual(p.range, { start: "2026-03-01", end: "2026-03-31" });
  assert.deepEqual(p.compare.range, { start: "2026-02-01", end: "2026-02-28" });
});

test("month-to-date never compares past the end of a shorter month", () => {
  const p = resolvePeriod({ p: "this_month" }, "2026-03-31");
  assert.deepEqual(p.compare.range, { start: "2026-02-01", end: "2026-02-28" });
});

test("future periods are flagged and never clipped into today", () => {
  const p = resolvePeriod({ p: "year", y: "2027" }, TODAY);
  assert.equal(p.future, true);
});

test("custom ranges are ordered and compared with the preceding range", () => {
  const p = resolvePeriod({ p: "custom", from: "2026-10-10", to: "2026-10-01" }, TODAY);
  assert.deepEqual(p.range, { start: "2026-10-01", end: "2026-10-10" });
  assert.deepEqual(p.compare.range, { start: "2026-09-21", end: "2026-09-30" });
});

test("demand index is monotonic in BSR and bounded", () => {
  assert.equal(bsrToDemandIndex(1), 100);
  assert.ok(bsrToDemandIndex(10) > bsrToDemandIndex(1000));
  assert.equal(bsrToDemandIndex(10_000_000), 0);
});

test("profit with ITC excludes recoverable GST", () => {
  const r = calculateProfit({
    sellingPrice: 1180,
    productGstPct: 18,
    purchaseCost: 472,
    purchaseGstPct: 18,
    shipping: 70,
    packaging: 15,
    other: 0,
    referralFeePct: 10,
    closingFee: 61,
    claimsItc: true,
  });
  assert.equal(r.netSellingPrice, 1000);
  assert.equal(r.outputGst, 180);
  assert.equal(r.netPurchaseCost, 400);
  assert.equal(r.grossProfit, 600);
  assert.equal(r.amazonFees, 179); // 118 referral + 61 closing
  assert.equal(r.gstOnFeesExpensed, 0);
  assert.equal(r.netProfit, 1000 - 400 - 179 - 70 - 15);
  assert.equal(r.marginPct, 33.6);
});

test("profit without ITC counts purchase GST and fee GST as costs", () => {
  const r = calculateProfit({
    sellingPrice: 1180,
    productGstPct: 18,
    purchaseCost: 472,
    purchaseGstPct: 18,
    shipping: 0,
    packaging: 0,
    other: 0,
    referralFeePct: 10,
    closingFee: 61,
    claimsItc: false,
  });
  assert.equal(r.netPurchaseCost, 472);
  assert.equal(r.gstOnFeesExpensed, 32.22);
  assert.equal(r.netProfit, Math.round((1000 - 472 - 179 - 32.22) * 100) / 100);
});

const ds = generateDemoDataset(TODAY);

test("no snapshots exist before collection started or during the outage", () => {
  for (const s of ds.snapshots.values()) {
    for (const snap of s) {
      assert.ok(snap.date >= DEMO_HISTORY_START);
      assert.ok(snap.date <= TODAY);
      assert.ok(!(snap.date >= DEMO_OUTAGE.start && snap.date <= DEMO_OUTAGE.end));
      assert.equal(snap.source, "demo");
    }
  }
});

test("periods without snapshots report nothing instead of reusing current data", () => {
  const range = { start: "2024-01-01", end: "2024-12-31" };
  assert.equal(coverage(ds, range).status, "none");
  assert.equal(rankProducts(ds, range).length, 0);
  const rep = periodReport(ds, range, { start: "2023-01-01", end: "2023-12-31" });
  assert.equal(rep.ranking.length, 0);
  assert.equal(rep.entering.length, 0);
});

test("partial coverage is reported for a period spanning the outage", () => {
  const c = coverage(ds, { start: "2025-08-01", end: "2025-08-31" });
  assert.equal(c.status, "partial");
  assert.equal(c.coveredDays, 27);
});

test("trend score refuses to score with too little history", () => {
  const few: Snapshot[] = [0, 1, 2].map((i) => ({
    date: addDays(TODAY, -i),
    price: 100,
    listPrice: null,
    rating: 4,
    reviewCount: 10,
    bsr: 100,
    demandIndex: 50,
    source: "demo",
  }));
  const t = trendScore(few.reverse(), TODAY, 14);
  assert.equal(t.score, null);
  assert.ok(t.insufficient);
});

test("CSV export escapes quotes and neutralises formulas", () => {
  const csv = reportToCSV({ title: "T", period: "P", generatedAt: "G", notes: [], columns: ["a", "b"], rows: [['=HYPERLINK("x")', 'say "hi", ok']], available: true });
  assert.ok(csv.includes(`"'=HYPERLINK(""x"")"`));
  assert.ok(csv.includes(`"say ""hi"", ok"`));
});

test("dataset generation is deterministic", () => {
  const again: Dataset = generateDemoDataset(TODAY);
  const a = ds.products[5];
  assert.deepEqual(again.snapshots.get(a.id)!.slice(-3), ds.snapshots.get(a.id)!.slice(-3));
});
