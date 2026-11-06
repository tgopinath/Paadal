/**
 * Database integration test. Runs only when TEST_DATABASE_URL points at a
 * migrated, disposable database:
 *   TEST_DATABASE_URL=postgres://… npm run test:db
 */
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import postgres from "postgres";

const url = process.env.TEST_DATABASE_URL;

test("database integration", { skip: !url && "TEST_DATABASE_URL not set" }, async (t) => {
  process.env.DATABASE_URL = url;
  const { db } = await import("../src/lib/db");
  const { ingest } = await import("../src/lib/data/ingest");
  const { loadDataset } = await import("../src/lib/data/postgres-repository");
  const { generateDemoDataset } = await import("../src/lib/data/demo-generator");
  const { rankProducts, coverage } = await import("../src/lib/analytics/engine");
  const { addDays } = await import("../src/lib/dates");

  const sql = db();
  const TODAY = "2026-11-05";
  const demo = generateDemoDataset(TODAY);
  const start = addDays(TODAY, -119);
  const rows = demo.products.flatMap((p) =>
    demo.snapshots
      .get(p.id)!
      .filter((s) => s.date >= start)
      .map((s) => ({
        asin: p.asin,
        date: s.date,
        title: p.title,
        brand: p.brand,
        categoryId: p.categoryId,
        subcategory: p.subcategory,
        price: s.price,
        listPrice: s.listPrice,
        rating: s.rating,
        reviewCount: s.reviewCount,
        bsr: s.bsr,
      })),
  );

  await sql`TRUNCATE products, ingestion_runs CASCADE`;

  await t.test("ingest writes every row and is idempotent", async () => {
    const r1 = await ingest(sql, "csv", rows, "integration test");
    assert.equal(r1.rowsWritten, rows.length);
    assert.equal(r1.productsCreated, demo.products.length);
    const r2 = await ingest(sql, "csv", rows, "re-import");
    assert.equal(r2.productsCreated, 0);
    const [{ n }] = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM product_snapshots`;
    assert.equal(n, rows.length, "re-import must update in place, not duplicate");
  });

  await t.test("a partial observation keeps the fields it didn't observe", async () => {
    const r = rows[0];
    await ingest(sql, "csv", [{ asin: r.asin, date: r.date, verifiedUnits: 9 }], "sales only");
    const [row] = await sql<{ price: number; best_sellers_rank: number; verified_units: number }[]>`
      SELECT s.price, s.best_sellers_rank, s.verified_units FROM product_snapshots s JOIN products p ON p.id = s.product_id
      WHERE p.asin = ${r.asin} AND s.captured_date = ${r.date}::date`;
    assert.equal(row.price, r.price);
    assert.equal(row.best_sellers_rank, r.bsr);
    assert.equal(row.verified_units, 9);
  });

  await t.test("demo-source rows never reach the analytics view", async () => {
    const [p] = await sql<{ id: string }[]>`SELECT id FROM products LIMIT 1`;
    await sql`SELECT ensure_snapshot_partition('2026-11-01')`;
    await sql`INSERT INTO product_snapshots (product_id, captured_at, captured_date, price, data_source, source_confidence)
              VALUES (${p.id}, '2026-11-05T06:30:00Z', '2026-11-05', 1, 'demo', 'observed')`;
    await sql`REFRESH MATERIALIZED VIEW CONCURRENTLY daily_product_rollups`;
    const [{ n }] = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM daily_product_rollups WHERE 'demo' = ANY(sources)`;
    assert.equal(n, 0);
  });

  await t.test("repository rankings match the in-memory engine", async () => {
    const { ds, sources } = await loadDataset(TODAY);
    assert.deepEqual(sources, ["csv"]);
    const range = { start: addDays(TODAY, -29), end: TODAY };
    const a = rankProducts(ds, range).slice(0, 25).map((r) => [r.product.asin, r.avgDemand!.toFixed(1)]);
    const b = rankProducts(demo, range).slice(0, 25).map((r) => [r.product.asin, r.avgDemand!.toFixed(1)]);
    assert.deepEqual(a, b);
    // History before the import window is reported as missing, not filled in.
    assert.equal(coverage(ds, { start: "2025-01-01", end: "2025-12-31" }).status, "none");
  });

  await sql.end();
});

before(() => {});
after(() => {});
void postgres;
