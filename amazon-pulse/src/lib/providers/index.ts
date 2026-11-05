/**
 * Data provider registry. Each provider is an adapter that turns a permitted
 * source into normalised Product + Snapshot rows for the ingestion worker
 * (Phase 6). Credentials come only from environment variables or a secrets
 * manager. They are never stored in the database or sent to the browser.
 *
 * Policy: no scraping of Amazon shopping pages, and no bypassing of CAPTCHA,
 * authentication, rate limits or anti-bot measures.
 */
import type { DataSourceKind, ISODate, Product, Snapshot } from "../types";

export interface ProviderBatch {
  products: Omit<Product, "id">[];
  snapshots: (Snapshot & { asin: string })[];
}

export interface ProductDataProvider {
  id: Exclude<DataSourceKind, "demo">;
  name: string;
  /** What this source can legitimately provide. */
  provides: string[];
  /** What it cannot provide, shown to users so expectations are right. */
  limitations: string[];
  envVars: { name: string; description: string; secret: boolean }[];
  docsUrl: string;
  /** Collect a snapshot batch for the given ASINs on `date`. */
  collect(asins: string[], date: ISODate): Promise<ProviderBatch>;
}

class NotConnectedError extends Error {
  constructor(provider: string) {
    super(`${provider} adapter is not implemented yet (Phase 6).`);
  }
}

export const PROVIDERS: ProductDataProvider[] = [
  {
    id: "pa_api",
    name: "Amazon Product Advertising API 5.0",
    provides: ["Title, brand, images, browse node / category", "Current offer price and list price", "Sales rank where returned (Website Sales Rank)"],
    limitations: [
      "Requires an approved Amazon Associates (India) account with qualifying sales to keep access",
      "Request quotas scale with referral revenue",
      "No sales volumes; ratings and review counts are not returned",
      "Confirm current API availability and terms for Amazon.in before building on it",
    ],
    envVars: [
      { name: "PAAPI_ACCESS_KEY", description: "PA-API access key", secret: true },
      { name: "PAAPI_SECRET_KEY", description: "PA-API secret key", secret: true },
      { name: "PAAPI_PARTNER_TAG", description: "Associates tracking ID, e.g. yourtag-21", secret: false },
      { name: "PAAPI_HOST", description: "webservices.amazon.in", secret: false },
    ],
    docsUrl: "https://webservices.amazon.com/paapi5/documentation/",
    async collect() {
      throw new NotConnectedError("PA-API");
    },
  },
  {
    id: "sp_api",
    name: "Amazon Selling Partner API",
    provides: [
      "Your own orders and verified unit sales (Sales & Traffic reports)",
      "Catalog Items: attributes, classifications, sales ranks",
      "Product Pricing: competitive pricing for ASINs",
    ],
    limitations: ["Verified sales only for your own seller account", "Marketplace-wide sales are not available from any Amazon API", "Requires a registered SP-API application and seller authorisation"],
    envVars: [
      { name: "SPAPI_LWA_CLIENT_ID", description: "Login with Amazon client ID", secret: false },
      { name: "SPAPI_LWA_CLIENT_SECRET", description: "Login with Amazon client secret", secret: true },
      { name: "SPAPI_REFRESH_TOKEN", description: "Seller authorisation refresh token", secret: true },
      { name: "SPAPI_MARKETPLACE_ID", description: "A21TJRUUN4KGV (Amazon.in)", secret: false },
      { name: "SPAPI_ENDPOINT", description: "https://sellingpartnerapi-eu.amazon.com", secret: false },
    ],
    docsUrl: "https://developer-docs.amazon.com/sp-api/",
    async collect() {
      throw new NotConnectedError("SP-API");
    },
  },
  {
    id: "licensed",
    name: "Licensed product-research API",
    provides: ["Historical price and rank series", "Provider unit-sales estimates (stored and labelled as the provider's estimates)"],
    limitations: ["Subject to the provider's licence terms and attribution rules", "Estimates differ between providers; never shown as verified sales"],
    envVars: [
      { name: "RESEARCH_API_PROVIDER", description: "Provider identifier, e.g. keepa", secret: false },
      { name: "RESEARCH_API_KEY", description: "Provider API key", secret: true },
    ],
    docsUrl: "https://keepa.com/#!discuss/t/keepa-api/",
    async collect() {
      throw new NotConnectedError("Licensed provider");
    },
  },
  {
    id: "csv",
    name: "CSV import",
    provides: ["Your own historical exports (Seller Central reports, provider exports)", "Back-fills history before collection started"],
    limitations: ["Data is only as accurate as the file", "Each row must carry a capture date; rows without one are rejected"],
    envVars: [],
    docsUrl: "/data-sources#csv-format",
    async collect() {
      throw new NotConnectedError("CSV import");
    },
  },
];

/** Server-only: whether every required variable is set. Never returns values. */
export function providerStatus(p: ProductDataProvider): { configured: boolean; missing: string[] } {
  const missing = p.envVars.filter((v) => !process.env[v.name]).map((v) => v.name);
  return { configured: p.envVars.length > 0 && missing.length === 0, missing };
}

export const CSV_COLUMNS = [
  { name: "captured_at", required: true, example: "2026-10-31", note: "Capture date (YYYY-MM-DD). Rows without one are rejected." },
  { name: "asin", required: true, example: "B0XXXXXXXX", note: "10-character ASIN" },
  { name: "title", required: false, example: "Stainless steel water bottle, 1L", note: "Used when the ASIN is new" },
  { name: "brand", required: false, example: "Acme", note: "" },
  { name: "category", required: false, example: "Home & Kitchen", note: "Mapped to a category" },
  { name: "price", required: false, example: "799", note: "INR, GST inclusive" },
  { name: "list_price", required: false, example: "1299", note: "INR" },
  { name: "rating", required: false, example: "4.3", note: "0–5" },
  { name: "review_count", required: false, example: "1532", note: "" },
  { name: "best_sellers_rank", required: false, example: "2140", note: "Category BSR" },
  { name: "units_sold", required: false, example: "37", note: "Only for your own verified sales; stored as verified" },
];
