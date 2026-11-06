/**
 * Amazon Selling Partner API collector (your own seller account, Amazon.in).
 *
 * Daily run:
 *  1. Sales & Traffic business report for yesterday (IST): verified units
 *     ordered per child ASIN. This also discovers your ASINs.
 *  2. For your ASINs plus already-tracked ones: Catalog Items (title, brand,
 *     category, main image, Best Sellers Rank) and Product Pricing (Buy Box
 *     or lowest offer price, list price), within Amazon's rate limits.
 *
 * Auth: Login with Amazon refresh token, sent as `x-amz-access-token`.
 * Shapes follow amzn/selling-partner-api-models: reports 2021-06-30,
 * catalogItems 2022-04-01, productPricing v0, sellerSalesAndTrafficReport.
 *
 * Steps fail softly: if the report is unavailable (for example the app lacks
 * the role), prices and ranks are still collected and the run log says why.
 */
import { gunzipSync } from "node:zlib";
import { addDays } from "../dates";
import type { IngestRow } from "../data/ingest";
import type { ISODate } from "../types";

export interface SpApiConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  marketplaceId: string;
  endpoint: string;
  /** Login with Amazon token URL; overridable only for tests and sandboxes. */
  lwaUrl?: string;
  /** Max ASINs priced per run; pricing allows ~0.5 requests/second. */
  maxAsins: number;
  /** Injected in tests. */
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
}

export const AMAZON_IN_MARKETPLACE = "A21TJRUUN4KGV";
const LWA_TOKEN_URL = "https://api.amazon.com/auth/o2/token";
const USER_AGENT = "AmazonPulse/1.0 (Language=TypeScript)";

export function spApiConfigFromEnv(): SpApiConfig {
  const need = (k: string) => {
    const v = process.env[k];
    if (!v) throw new Error(`${k} is not set`);
    return v;
  };
  return {
    clientId: need("SPAPI_LWA_CLIENT_ID"),
    clientSecret: need("SPAPI_LWA_CLIENT_SECRET"),
    refreshToken: need("SPAPI_REFRESH_TOKEN"),
    marketplaceId: process.env.SPAPI_MARKETPLACE_ID || AMAZON_IN_MARKETPLACE,
    endpoint: (process.env.SPAPI_ENDPOINT || "https://sellingpartnerapi-eu.amazon.com").replace(/\/$/, ""),
    lwaUrl: process.env.SPAPI_LWA_URL || LWA_TOKEN_URL,
    maxAsins: Number(process.env.SPAPI_MAX_ASINS ?? 40),
  };
}

/** Map Amazon's website display group to an Amazon Pulse category. */
export function mapCategory(group: string | null | undefined): string | null {
  if (!group) return null;
  const g = group.toLowerCase();
  const rules: [RegExp, string][] = [
    [/electronic|wireless|camera|computer|pc|video_games|phone|ce_display/, "electronics"],
    [/kitchen|home|furniture|lighting|garden|lawn|appliance/, "home-kitchen"],
    [/apparel|shoe|jewel|watch|luggage|fashion|clothing/, "fashion"],
    [/beauty|personal_care|health|drugstore|luxury_beauty/, "beauty"],
    [/sport|fitness|outdoor/, "sports"],
    [/toy|game|baby/, "toys"],
    [/grocery|gourmet|food|pantry/, "grocery"],
    [/office|stationery|book/, "office"],
  ];
  for (const [re, id] of rules) if (re.test(g)) return id;
  return "other";
}

function istDayBounds(day: ISODate): { start: string; end: string } {
  // Amazon.in reports in IST; express the IST calendar day in UTC.
  return { start: `${day}T00:00:00+05:30`, end: `${day}T23:59:59+05:30` };
}

class SpApiClient {
  private token: { value: string; expires: number } | null = null;
  private fetch: typeof fetch;
  private sleep: (ms: number) => Promise<void>;

  constructor(private cfg: SpApiConfig) {
    this.fetch = cfg.fetch ?? fetch;
    this.sleep = cfg.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  }

  private async accessToken(): Promise<string> {
    if (this.token && this.token.expires > Date.now() + 60_000) return this.token.value;
    const res = await this.fetch(this.cfg.lwaUrl ?? LWA_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: this.cfg.refreshToken,
        client_id: this.cfg.clientId,
        client_secret: this.cfg.clientSecret,
      }),
    });
    if (!res.ok) throw new Error(`Login with Amazon refused the credentials (HTTP ${res.status}). Check the client ID, secret and refresh token.`);
    const body = (await res.json()) as { access_token: string; expires_in: number };
    this.token = { value: body.access_token, expires: Date.now() + body.expires_in * 1000 };
    return body.access_token;
  }

  /** Calls the SP-API, retrying 429/5xx with backoff. */
  async call<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      const res = await this.fetch(`${this.cfg.endpoint}${path}`, {
        method,
        headers: {
          "x-amz-access-token": await this.accessToken(),
          "user-agent": USER_AGENT,
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (res.ok) return (await res.json()) as T;
      if ((res.status === 429 || res.status >= 500) && attempt < 3) {
        await this.sleep(2000 * 2 ** attempt);
        continue;
      }
      const text = await res.text().catch(() => "");
      const code = /"code"\s*:\s*"([^"]+)"/.exec(text)?.[1];
      throw new SpApiError(res.status, `${method} ${path.split("?")[0]} failed (HTTP ${res.status}${code ? `, ${code}` : ""})`);
    }
  }

  async download(url: string, compression?: string): Promise<string> {
    const res = await this.fetch(url);
    if (!res.ok) throw new Error(`Report download failed (HTTP ${res.status})`);
    const buf = Buffer.from(await res.arrayBuffer());
    return (compression === "GZIP" ? gunzipSync(buf) : buf).toString("utf8");
  }

  wait(ms: number) {
    return this.sleep(ms);
  }
}

export class SpApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

interface SalesTrafficReport {
  salesAndTrafficByAsin?: {
    parentAsin?: string;
    childAsin?: string;
    salesByAsin?: { unitsOrdered?: number };
  }[];
}

async function salesForDay(api: SpApiClient, marketplaceId: string, day: ISODate): Promise<Map<string, number>> {
  const { start, end } = istDayBounds(day);
  const created = await api.call<{ reportId: string }>("POST", "/reports/2021-06-30/reports", {
    reportType: "GET_SALES_AND_TRAFFIC_REPORT",
    marketplaceIds: [marketplaceId],
    dataStartTime: start,
    dataEndTime: end,
    reportOptions: { dateGranularity: "DAY", asinGranularity: "CHILD" },
  });
  // Reports usually finish within a minute or two. Give up after ~2 minutes so
  // the whole job (with ~40 ASINs priced at 0.5 req/s) fits in 5 minutes.
  for (let i = 0; i < 8; i++) {
    await api.wait(15_000);
    const r = await api.call<{ processingStatus: string; reportDocumentId?: string }>("GET", `/reports/2021-06-30/reports/${encodeURIComponent(created.reportId)}`);
    if (r.processingStatus === "DONE" && r.reportDocumentId) {
      const doc = await api.call<{ url: string; compressionAlgorithm?: string }>("GET", `/reports/2021-06-30/documents/${encodeURIComponent(r.reportDocumentId)}`);
      const report = JSON.parse(await api.download(doc.url, doc.compressionAlgorithm)) as SalesTrafficReport;
      const units = new Map<string, number>();
      for (const row of report.salesAndTrafficByAsin ?? []) {
        const asin = row.childAsin ?? row.parentAsin;
        if (asin) units.set(asin, (units.get(asin) ?? 0) + (row.salesByAsin?.unitsOrdered ?? 0));
      }
      return units;
    }
    if (r.processingStatus === "CANCELLED") return new Map(); // Amazon cancels when there is no data
    if (r.processingStatus === "FATAL") throw new Error("Amazon could not generate the sales report");
  }
  throw new Error("The sales report did not finish in time");
}

interface CatalogItem {
  asin: string;
  summaries?: { marketplaceId: string; itemName?: string; brand?: string; websiteDisplayGroup?: string; websiteDisplayGroupName?: string; browseClassification?: { displayName?: string } }[];
  salesRanks?: { marketplaceId: string; displayGroupRanks?: { rank: number; title?: string }[]; classificationRanks?: { rank: number; title?: string }[] }[];
  images?: { marketplaceId: string; images?: { variant?: string; link: string }[] }[];
}

interface Money {
  Amount?: number;
}
interface OffersResponse {
  payload?: {
    Summary?: {
      BuyBoxPrices?: { condition?: string; ListingPrice?: Money; LandedPrice?: Money }[];
      LowestPrices?: { condition?: string; ListingPrice?: Money; LandedPrice?: Money }[];
      ListPrice?: Money;
    };
  };
}

export function priceFromOffers(o: OffersResponse): { price: number | null; listPrice: number | null } {
  const s = o.payload?.Summary;
  const buyBox = s?.BuyBoxPrices?.find((p) => !p.condition || p.condition.toLowerCase() === "new");
  const lowest = (s?.LowestPrices ?? []).filter((p) => !p.condition || p.condition.toLowerCase() === "new").map((p) => p.ListingPrice?.Amount ?? p.LandedPrice?.Amount);
  const lowestPrice = lowest.filter((x): x is number => typeof x === "number").sort((a, b) => a - b)[0];
  return {
    price: buyBox?.ListingPrice?.Amount ?? buyBox?.LandedPrice?.Amount ?? lowestPrice ?? null,
    listPrice: s?.ListPrice?.Amount ?? null,
  };
}

export function rowFromCatalog(item: CatalogItem, marketplaceId: string) {
  const sum = item.summaries?.find((s) => s.marketplaceId === marketplaceId) ?? item.summaries?.[0];
  const ranks = item.salesRanks?.find((s) => s.marketplaceId === marketplaceId) ?? item.salesRanks?.[0];
  const imgs = item.images?.find((s) => s.marketplaceId === marketplaceId) ?? item.images?.[0];
  // The display-group rank is the familiar "#N in Category" Best Sellers Rank.
  const top = ranks?.displayGroupRanks?.[0] ?? ranks?.classificationRanks?.[0];
  const bsr = top?.rank ?? null;
  return {
    title: sum?.itemName ?? null,
    brand: sum?.brand ?? null,
    categoryId: mapCategory(sum?.websiteDisplayGroup ?? sum?.websiteDisplayGroupName),
    subcategory: sum?.browseClassification?.displayName ?? ranks?.classificationRanks?.[0]?.title ?? null,
    imageUrl: imgs?.images?.find((i) => i.variant === "MAIN")?.link ?? imgs?.images?.[0]?.link ?? null,
    bsr,
    rankCategory: top?.title ?? null,
  };
}

export function spApiConfigured(): boolean {
  return Boolean(process.env.SPAPI_LWA_CLIENT_ID && process.env.SPAPI_LWA_CLIENT_SECRET && process.env.SPAPI_REFRESH_TOKEN);
}

export interface DiscoveredProduct {
  asin: string;
  title: string | null;
  brand: string | null;
  categoryId: string | null;
  subcategory: string | null;
  imageUrl: string | null;
  bsr: number | null;
  rankCategory: string | null;
}

const INCLUDED = "summaries,salesRanks,images";

/** Keyword search of the Amazon.in catalog (searchCatalogItems), with Best Sellers Ranks. */
export async function searchCatalog(cfg: SpApiConfig, keywords: string, pageToken?: string): Promise<{ items: DiscoveredProduct[]; total: number; next: string | null }> {
  const api = new SpApiClient(cfg);
  const qs = new URLSearchParams({ marketplaceIds: cfg.marketplaceId, keywords: keywords.replace(/,/g, " ").trim(), includedData: INCLUDED, pageSize: "20" });
  if (pageToken) qs.set("pageToken", pageToken);
  const res = await api.call<{ numberOfResults?: number; pagination?: { nextToken?: string }; items?: CatalogItem[] }>("GET", `/catalog/2022-04-01/items?${qs.toString()}`);
  return {
    items: (res.items ?? []).map((it) => ({ asin: it.asin, ...rowFromCatalog(it, cfg.marketplaceId) })),
    total: res.numberOfResults ?? 0,
    next: res.pagination?.nextToken ?? null,
  };
}

/** One catalog item (getCatalogItem). */
export async function fetchCatalogItem(cfg: SpApiConfig, asin: string): Promise<DiscoveredProduct> {
  const api = new SpApiClient(cfg);
  const item = await api.call<CatalogItem>("GET", `/catalog/2022-04-01/items/${asin}?marketplaceIds=${cfg.marketplaceId}&includedData=${INCLUDED}`);
  return { asin, ...rowFromCatalog(item, cfg.marketplaceId) };
}

export async function collectSpApi(cfg: SpApiConfig, trackedAsins: string[], today: ISODate): Promise<{ rows: IngestRow[]; notes: string[] }> {
  const api = new SpApiClient(cfg);
  const notes: string[] = [];
  const rows: IngestRow[] = [];
  const yesterday = addDays(today, -1);

  // 1. Verified sales (yesterday, a complete day).
  let units = new Map<string, number>();
  try {
    units = await salesForDay(api, cfg.marketplaceId, yesterday);
    for (const [asin, n] of units) rows.push({ asin, date: yesterday, verifiedUnits: n });
  } catch (e) {
    const msg = e instanceof SpApiError && e.status === 403 ? "Sales report not permitted for this app (add the Brand Analytics / Selling Partner Insights role)." : (e as Error).message;
    // Bad credentials stop the whole run; anything else only skips sales.
    if (msg.startsWith("Login with Amazon")) throw e;
    notes.push(`Sales skipped: ${msg}`);
  }

  // 2. Listing data today: your selling ASINs first, then tracked ones.
  const asins = [...new Set([...units.keys(), ...trackedAsins])].filter((a) => /^[A-Z0-9]{10}$/.test(a));
  const batch = asins.slice(0, cfg.maxAsins);
  if (asins.length > batch.length) notes.push(`Priced ${batch.length} of ${asins.length} ASINs (SPAPI_MAX_ASINS).`);
  let failures = 0;
  for (const asin of batch) {
    try {
      const item = await api.call<CatalogItem>(
        "GET",
        `/catalog/2022-04-01/items/${asin}?marketplaceIds=${cfg.marketplaceId}&includedData=summaries,salesRanks,images`,
      );
      await api.wait(550); // catalog: 2 requests/second
      const cat = rowFromCatalog(item, cfg.marketplaceId);
      let price = { price: null as number | null, listPrice: null as number | null };
      try {
        price = priceFromOffers(await api.call<OffersResponse>("GET", `/products/pricing/v0/items/${asin}/offers?MarketplaceId=${cfg.marketplaceId}&ItemCondition=New`));
      } catch {
        /* no offers (e.g. out of stock): keep catalog data */
      }
      await api.wait(2100); // pricing: 0.5 requests/second
      rows.push({
        asin,
        date: today,
        title: cat.title,
        brand: cat.brand,
        categoryId: cat.categoryId,
        subcategory: cat.subcategory,
        imageUrl: cat.imageUrl,
        amazonUrl: `https://www.amazon.in/dp/${asin}`,
        price: price.price,
        listPrice: price.listPrice,
        bsr: cat.bsr,
      });
    } catch (e) {
      if ((e as Error).message.startsWith("Login with Amazon")) throw e;
      failures++;
    }
  }
  if (failures) notes.push(`${failures} ASIN(s) could not be read from the catalog.`);
  if (!asins.length) notes.push("No ASINs yet: no sales yesterday and nothing tracked. Import a CSV or wait for sales.");
  return { rows, notes };
}
