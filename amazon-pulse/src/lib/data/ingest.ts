import "server-only";
import type { Sql } from "postgres";
import { bsrToDemandIndex } from "../analytics/demand";
import { CATEGORY_BY_ID } from "../categories";
import type { DataSourceKind, ISODate } from "../types";

/** A normalised observation from any permitted source. */
export interface IngestRow {
  asin: string;
  date: ISODate;
  title?: string | null;
  brand?: string | null;
  categoryId?: string | null;
  subcategory?: string | null;
  imageUrl?: string | null;
  amazonUrl?: string | null;
  price?: number | null;
  listPrice?: number | null;
  rating?: number | null;
  reviewCount?: number | null;
  bsr?: number | null;
  estimatedUnits?: number | null;
  verifiedUnits?: number | null;
}

export interface IngestResult {
  runId: string;
  productsCreated: number;
  productsUpdated: number;
  rowsWritten: number;
}

const CHUNK = 500;

/**
 * Writes one batch as one ingestion run: upserts products, creates monthly
 * partitions as needed, upserts snapshots (one per product/day/source),
 * then refreshes the daily rollup view.
 */
export async function ingest(sql: Sql, source: Exclude<DataSourceKind, "demo">, rows: IngestRow[], note?: string): Promise<IngestResult> {
  const [run] = await sql<{ id: string }[]>`
    INSERT INTO ingestion_runs (source, status, note) VALUES (${source}, 'running', ${note ?? null}) RETURNING id`;
  try {
    const result = await sql.begin(async (tx) => {
      // 1. Products: newest descriptive fields win; first_seen keeps the earliest date.
      const byAsin = new Map<string, IngestRow & { firstSeen: ISODate }>();
      for (const r of [...rows].sort((a, b) => a.date.localeCompare(b.date))) {
        const prev = byAsin.get(r.asin);
        byAsin.set(r.asin, {
          ...prev,
          ...Object.fromEntries(Object.entries(r).filter(([, v]) => v != null && v !== "")),
          firstSeen: prev?.firstSeen ?? r.date,
        } as IngestRow & { firstSeen: ISODate });
      }
      const productRows = [...byAsin.values()].map((p) => ({
        asin: p.asin,
        title: p.title ?? p.asin,
        brand: p.brand ?? null,
        category_id: p.categoryId && CATEGORY_BY_ID.has(p.categoryId) ? p.categoryId : "other",
        subcategory: p.subcategory ?? null,
        image_url: p.imageUrl ?? null,
        amazon_url: p.amazonUrl ?? `https://www.amazon.in/dp/${p.asin}`,
        first_seen: p.firstSeen,
      }));
      let created = 0;
      const ids = new Map<string, string>();
      for (let i = 0; i < productRows.length; i += CHUNK) {
        const out = await tx<{ id: string; asin: string; inserted: boolean }[]>`
          INSERT INTO products ${tx(productRows.slice(i, i + CHUNK), "asin", "title", "brand", "category_id", "subcategory", "image_url", "amazon_url", "first_seen")}
          ON CONFLICT (marketplace, asin) DO UPDATE SET
            title       = CASE WHEN EXCLUDED.title <> EXCLUDED.asin THEN EXCLUDED.title ELSE products.title END,
            brand       = COALESCE(EXCLUDED.brand, products.brand),
            category_id = CASE WHEN EXCLUDED.category_id <> 'other' THEN EXCLUDED.category_id ELSE products.category_id END,
            subcategory = COALESCE(EXCLUDED.subcategory, products.subcategory),
            image_url   = COALESCE(EXCLUDED.image_url, products.image_url),
            first_seen  = LEAST(products.first_seen, EXCLUDED.first_seen),
            updated_at  = now()
          RETURNING id, asin, (xmax = 0) AS inserted`;
        for (const r of out) {
          ids.set(r.asin, r.id);
          if (r.inserted) created++;
        }
      }

      // 2. Partitions for every month touched.
      const months = [...new Set(rows.map((r) => `${r.date.slice(0, 7)}-01`))];
      for (const m of months) await tx`SELECT ensure_snapshot_partition(${m}::date)`;

      // 3. Snapshots. Captured at noon IST of the given date, so the row
      //    always lands in that month's partition.
      const snaps = rows.map((r) => ({
        product_id: ids.get(r.asin)!,
        captured_date: r.date,
        price: r.price ?? null,
        list_price: r.listPrice ?? null,
        rating: r.rating ?? null,
        review_count: r.reviewCount ?? null,
        best_sellers_rank: r.bsr ?? null,
        estimated_demand: r.bsr != null ? bsrToDemandIndex(r.bsr) : null,
        estimated_units: r.estimatedUnits ?? null,
        verified_units: r.verifiedUnits ?? null,
      }));
      let written = 0;
      for (let i = 0; i < snaps.length; i += CHUNK) {
        const chunk = snaps.slice(i, i + CHUNK);
        const res = await tx`
          INSERT INTO product_snapshots
            (product_id, captured_at, captured_date, price, list_price, rating, review_count, best_sellers_rank,
             estimated_demand, estimated_units, verified_units, data_source, source_confidence, ingestion_run_id)
          SELECT
            x.product_id::uuid, (x.captured_date::date + time '12:00') AT TIME ZONE 'Asia/Kolkata', x.captured_date::date,
            x.price::numeric, x.list_price::numeric, x.rating::numeric, x.review_count::int, x.best_sellers_rank::int,
            x.estimated_demand::numeric, x.estimated_units::int, x.verified_units::int,
            ${source}::data_source, 'observed', ${run.id}::uuid
          FROM json_to_recordset(${JSON.stringify(chunk)}::text::json) AS x(
            product_id text, captured_date text, price text, list_price text, rating text, review_count text,
            best_sellers_rank text, estimated_demand text, estimated_units text, verified_units text)
          -- A later observation fills in or replaces fields; a field it didn't
          -- observe (null) keeps the earlier value. Sources report in parts
          -- (e.g. prices today, yesterday's sales report tomorrow).
          ON CONFLICT (product_id, captured_date, data_source, captured_at) DO UPDATE SET
            price = COALESCE(EXCLUDED.price, product_snapshots.price),
            list_price = COALESCE(EXCLUDED.list_price, product_snapshots.list_price),
            rating = COALESCE(EXCLUDED.rating, product_snapshots.rating),
            review_count = COALESCE(EXCLUDED.review_count, product_snapshots.review_count),
            best_sellers_rank = COALESCE(EXCLUDED.best_sellers_rank, product_snapshots.best_sellers_rank),
            estimated_demand = COALESCE(EXCLUDED.estimated_demand, product_snapshots.estimated_demand),
            estimated_units = COALESCE(EXCLUDED.estimated_units, product_snapshots.estimated_units),
            verified_units = COALESCE(EXCLUDED.verified_units, product_snapshots.verified_units),
            ingestion_run_id = EXCLUDED.ingestion_run_id`;
        written += res.count;
      }
      return { productsCreated: created, productsUpdated: ids.size - created, rowsWritten: written };
    });

    await sql`REFRESH MATERIALIZED VIEW CONCURRENTLY daily_product_rollups`;
    await sql`
      UPDATE ingestion_runs SET status = 'succeeded', finished_at = now(),
        products_ok = ${result.productsCreated + result.productsUpdated}, rows_written = ${result.rowsWritten}
      WHERE id = ${run.id}`;
    return { runId: run.id, ...result };
  } catch (e) {
    await sql`UPDATE ingestion_runs SET status = 'failed', finished_at = now(), error = ${String((e as Error).message).slice(0, 2000)} WHERE id = ${run.id}`;
    throw e;
  }
}
