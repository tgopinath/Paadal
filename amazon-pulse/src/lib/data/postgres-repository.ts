import "server-only";
import { db } from "../db";
import type { Dataset } from "../analytics/engine";
import type { DataSourceKind, ISODate, Product, Snapshot } from "../types";

/**
 * Loads the analysis dataset from Postgres: product rows plus one rollup row
 * per product per day (daily_product_rollups). Demo rows are excluded in the
 * view itself.
 *
 * The analytics engine works in memory, which suits catalogues of up to a few
 * thousand products × a few years of days. Past that, move period ranking
 * and series aggregation into SQL over the same view (see ARCHITECTURE §2).
 */
export interface PgLoad {
  ds: Dataset;
  sources: DataSourceKind[];
  version: string;
}

export async function dataVersion(): Promise<string> {
  const sql = db();
  const [r] = await sql<{ v: string | null }[]>`
    SELECT max(finished_at)::text AS v FROM ingestion_runs WHERE status IN ('succeeded', 'partial')`;
  return r?.v ?? "none";
}

export async function loadDataset(today: ISODate): Promise<PgLoad> {
  const sql = db();
  const version = await dataVersion();
  const products = await sql<
    { id: string; asin: string; title: string; brand: string | null; category_id: string; subcategory: string | null; image_url: string | null; amazon_url: string | null; first_seen: string }[]
  >`SELECT id, asin, title, brand, category_id, subcategory, image_url, amazon_url, first_seen::text
    FROM products p
    WHERE EXISTS (SELECT 1 FROM daily_product_rollups r WHERE r.product_id = p.id)
    ORDER BY asin`;

  const rows = await sql<
    {
      product_id: string;
      day: string;
      avg_demand: number | null;
      avg_bsr: number | null;
      close_price: number | null;
      close_list_price: number | null;
      close_reviews: number | null;
      close_rating: number | null;
      sources: string;
    }[]
  >`SELECT product_id, day::text, avg_demand, avg_bsr, close_price, close_list_price, close_reviews, close_rating, sources::text
    FROM daily_product_rollups
    WHERE day <= ${today}::date
    ORDER BY product_id, day`;

  const snapshots = new Map<string, Snapshot[]>();
  const seen = new Set<DataSourceKind>();
  for (const r of rows) {
    const src = r.sources.replace(/[{}]/g, "").split(",")[0] as DataSourceKind;
    r.sources
      .replace(/[{}]/g, "")
      .split(",")
      .forEach((s) => seen.add(s as DataSourceKind));
    const list = snapshots.get(r.product_id) ?? [];
    list.push({
      date: r.day,
      price: r.close_price,
      listPrice: r.close_list_price,
      rating: r.close_rating,
      reviewCount: r.close_reviews,
      bsr: r.avg_bsr,
      demandIndex: r.avg_demand,
      source: src,
    });
    snapshots.set(r.product_id, list);
  }

  const ps: Product[] = products.map((p) => ({
    id: p.id,
    asin: p.asin,
    title: p.title,
    brand: p.brand ?? "—",
    categoryId: p.category_id,
    subcategory: p.subcategory ?? "General",
    imageUrl: p.image_url,
    amazonUrl: p.amazon_url,
    firstSeen: p.first_seen,
  }));

  return { ds: { products: ps, snapshots, today }, sources: [...seen].sort(), version };
}
