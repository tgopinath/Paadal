"use server";
import { revalidatePath } from "next/cache";
import { db, hasDatabase } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { appMode } from "@/lib/data/repository";
import { ingest } from "@/lib/data/ingest";
import { parseAsin } from "@/lib/asin";
import { todayIST } from "@/lib/dates";
import { fetchCatalogItem, spApiConfigFromEnv, spApiConfigured } from "@/lib/providers/sp-api";
import { ensureDefault } from "@/lib/watchlist-db";

export interface TrackState {
  ok?: string;
  error?: string;
  asin?: string;
}

/**
 * Starts tracking a product: records today's catalog data (title, category,
 * image, Best Sellers Rank) from the SP-API when it's connected, adds the
 * product to the daily collection and to the user's watchlist.
 * Data comes from Amazon's API on the server, never from the browser.
 */
export async function trackProduct(_: TrackState, form: FormData): Promise<TrackState> {
  if (appMode() !== "production" || !hasDatabase()) return { error: "Tracking needs production mode with a database." };
  const user = await getCurrentUser();
  if (!user) return { error: "Sign in to track products." };
  const parsed = parseAsin(String(form.get("asin") ?? ""));
  if ("error" in parsed) return { error: parsed.error };
  const { asin } = parsed;
  const sql = db();

  let message: string;
  if (spApiConfigured()) {
    try {
      const item = await fetchCatalogItem(spApiConfigFromEnv(), asin);
      await ingest(sql, "sp_api", [
        {
          asin,
          date: todayIST(),
          title: item.title,
          brand: item.brand,
          categoryId: item.categoryId,
          subcategory: item.subcategory,
          imageUrl: item.imageUrl,
          amazonUrl: `https://www.amazon.in/dp/${asin}`,
          bsr: item.bsr,
        },
      ], `tracked by ${user.email}`);
      message = `Tracking ${item.title ?? asin}. Today's rank is recorded; price and trend build up from the daily collection.`;
    } catch (e) {
      const status = (e as { status?: number }).status;
      return { error: status === 404 ? `Amazon.in has no product ${asin}.` : "Amazon's API didn't respond. Try again in a minute.", asin };
    }
  } else {
    await sql`INSERT INTO products (asin, title, amazon_url) VALUES (${asin}, ${asin}, ${`https://www.amazon.in/dp/${asin}`}) ON CONFLICT (marketplace, asin) DO NOTHING`;
    message = `Added ${asin}. Its data arrives once the Selling Partner API credentials are set.`;
  }

  const wid = await ensureDefault(sql, user.id);
  await sql`
    INSERT INTO watchlist_products (watchlist_id, product_id)
    SELECT ${wid}, id FROM products WHERE asin = ${asin}
    ON CONFLICT DO NOTHING`;
  revalidatePath("/discover");
  return { ok: message, asin };
}
