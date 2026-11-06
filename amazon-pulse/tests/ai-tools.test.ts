import { test } from "node:test";
import assert from "node:assert/strict";
import { buildTools } from "../src/lib/ai/tools";
import { generateDemoDataset } from "../src/lib/data/demo-generator";
import { dataBounds } from "../src/lib/analytics/engine";
import type { DataContext } from "../src/lib/data/repository";

const ds = generateDemoDataset("2026-11-05");
const { first, last } = dataBounds(ds);
const ctx: DataContext = { mode: "demo", ds, sources: ["demo"], firstSnapshot: first, lastSnapshot: last };
const tools = Object.fromEntries(buildTools(ctx).map((t) => [t.name, t]));
const call = async (name: string, input: Record<string, unknown>) => JSON.parse((await tools[name].run(tools[name].parse(input) as never)) as string);

test("every result carries source and freshness", async () => {
  const r = await call("period_ranking", { period: { p: "this_week" }, top_n: 5 });
  assert.equal(r.is_demo_data, true);
  assert.equal(r.latest_snapshot, "2026-11-05");
  assert.equal(r.products.length, 5);
  assert.ok(r.coverage.coveredDays > 0);
});

test("periods without snapshots say so instead of returning data", async () => {
  const r = await call("period_ranking", { period: { p: "month", m: "2024-01" } });
  assert.equal(r.result, "Historical data not available for this period.");
  assert.equal(r.products, undefined);
});

test("filters and lenses return products", async () => {
  const s = await call("search_products", { max_price_inr: 500, demand_levels: ["very_high", "high"] });
  assert.ok(s.products.every((p: { price_inr: number }) => p.price_inr <= 500));
  const t = await call("trending", { lens: "week" });
  assert.ok(Array.isArray(t.products));
  const c = await call("category_performance", { period: { p: "this_month" } });
  assert.ok(c.categories.length > 0);
  const o = await call("opportunities", { classification: "high", limit: 3 });
  assert.ok(o.products.every((p: { class: string }) => p.class === "high"));
});

test("product tools handle unknown ASINs", async () => {
  const asin = ds.products[0].asin;
  const d = await call("product_detail", { asin });
  assert.equal(d.product.asin, asin);
  assert.ok(Array.isArray(d.history_summary));
  const missing = await call("product_detail", { asin: "B0NOTREAL0" });
  assert.match(missing.error, /not tracked/);
  const cmp = await call("compare_products", { asins: [asin, ds.products[1].asin, "B0NOTREAL0"] });
  assert.equal(cmp.products.length, 2);
  assert.deepEqual(cmp.not_found, ["B0NOTREAL0"]);
});
