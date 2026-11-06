import { test } from "node:test";
import assert from "node:assert/strict";
import { gzipSync } from "node:zlib";
import { collectSpApi, mapCategory, priceFromOffers, type SpApiConfig } from "../src/lib/providers/sp-api";

const EP = "https://sellingpartnerapi-eu.amazon.com";
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { "Content-Type": "application/json" } });

function fakeAmazon(opts: { reportStatus?: number; lwaStatus?: number } = {}) {
  const calls: { url: string; method: string; headers: Record<string, string>; body?: string }[] = [];
  let polls = 0;
  const report = { salesAndTrafficByAsin: [{ parentAsin: "B0PARENT01", childAsin: "B0CHILD001", salesByAsin: { unitsOrdered: 7 } }] };
  const f = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, method: init?.method ?? "GET", headers: (init?.headers as Record<string, string>) ?? {}, body: init?.body?.toString() });
    if (url === "https://api.amazon.com/auth/o2/token") return opts.lwaStatus ? json({ error: "invalid_grant" }, opts.lwaStatus) : json({ access_token: "Atza|test", expires_in: 3600 });
    if (url === `${EP}/reports/2021-06-30/reports`) return opts.reportStatus ? json({ errors: [{ code: "Unauthorized" }] }, opts.reportStatus) : json({ reportId: "R1" }, 202);
    if (url === `${EP}/reports/2021-06-30/reports/R1`) return json(++polls < 2 ? { processingStatus: "IN_PROGRESS" } : { processingStatus: "DONE", reportDocumentId: "D1" });
    if (url === `${EP}/reports/2021-06-30/documents/D1`) return json({ reportDocumentId: "D1", url: "https://s3.example/doc", compressionAlgorithm: "GZIP" });
    if (url === "https://s3.example/doc") return new Response(gzipSync(Buffer.from(JSON.stringify(report))));
    if (url.startsWith(`${EP}/catalog/2022-04-01/items/`)) {
      const asin = url.split("/items/")[1].split("?")[0];
      return json({
        asin,
        summaries: [{ marketplaceId: "A21TJRUUN4KGV", itemName: `Item ${asin}`, brand: "Acme", websiteDisplayGroup: "kitchen_display_on_website", browseClassification: { displayName: "Water Bottles" } }],
        salesRanks: [{ marketplaceId: "A21TJRUUN4KGV", displayGroupRanks: [{ rank: 1234, title: "Home & Kitchen" }], classificationRanks: [{ rank: 12, title: "Water Bottles" }] }],
        images: [{ marketplaceId: "A21TJRUUN4KGV", images: [{ variant: "PT01", link: "https://m.media-amazon.com/x.jpg" }, { variant: "MAIN", link: "https://m.media-amazon.com/main.jpg" }] }],
      });
    }
    if (url.startsWith(`${EP}/products/pricing/v0/items/`)) {
      return json({ payload: { Summary: { BuyBoxPrices: [{ condition: "New", ListingPrice: { CurrencyCode: "INR", Amount: 799 } }], ListPrice: { CurrencyCode: "INR", Amount: 1299 } } } });
    }
    return json({}, 404);
  }) as typeof fetch;
  return { f, calls };
}

const cfg = (f: typeof fetch): SpApiConfig => ({
  clientId: "amzn1.application-oa2-client.x",
  clientSecret: "secret",
  refreshToken: "Atzr|refresh",
  marketplaceId: "A21TJRUUN4KGV",
  endpoint: EP,
  maxAsins: 40,
  fetch: f,
  sleep: async () => {},
});

test("collects yesterday's verified units and today's listing data", async () => {
  const { f, calls } = fakeAmazon();
  const { rows, notes } = await collectSpApi(cfg(f), ["B0TRACKED1"], "2026-11-06");
  assert.deepEqual(notes, []);
  const sales = rows.find((r) => r.date === "2026-11-05");
  assert.deepEqual(sales, { asin: "B0CHILD001", date: "2026-11-05", verifiedUnits: 7 });
  const listing = rows.filter((r) => r.date === "2026-11-06").map((r) => r.asin);
  assert.deepEqual(listing, ["B0CHILD001", "B0TRACKED1"]);
  const one = rows.find((r) => r.asin === "B0CHILD001" && r.date === "2026-11-06")!;
  assert.equal(one.price, 799);
  assert.equal(one.listPrice, 1299);
  assert.equal(one.bsr, 1234);
  assert.equal(one.categoryId, "home-kitchen");
  assert.equal(one.imageUrl, "https://m.media-amazon.com/main.jpg");
  assert.equal(one.amazonUrl, "https://www.amazon.in/dp/B0CHILD001");
  // Report covers the IST calendar day and asks for daily, child-ASIN data.
  const create = JSON.parse(calls.find((c) => c.url.endsWith("/reports/2021-06-30/reports"))!.body!);
  assert.equal(create.reportType, "GET_SALES_AND_TRAFFIC_REPORT");
  assert.equal(create.dataStartTime, "2026-11-05T00:00:00+05:30");
  assert.deepEqual(create.reportOptions, { dateGranularity: "DAY", asinGranularity: "CHILD" });
  // Every SP-API call carries the LWA access token; the token is fetched once.
  assert.ok(calls.filter((c) => c.url.startsWith(EP)).every((c) => c.headers["x-amz-access-token"] === "Atza|test"));
  assert.equal(calls.filter((c) => c.url.includes("auth/o2/token")).length, 1);
});

test("a missing report role skips sales but still collects listings", async () => {
  const { f } = fakeAmazon({ reportStatus: 403 });
  const { rows, notes } = await collectSpApi(cfg(f), ["B0TRACKED1"], "2026-11-06");
  assert.equal(rows.length, 1);
  assert.match(notes[0], /Sales skipped: .*role/);
});

test("bad credentials stop the run with a clear message", async () => {
  const { f } = fakeAmazon({ lwaStatus: 400 });
  await assert.rejects(collectSpApi(cfg(f), ["B0TRACKED1"], "2026-11-06"), /Login with Amazon refused/);
});

test("price falls back to the lowest new offer; categories map", () => {
  assert.deepEqual(priceFromOffers({ payload: { Summary: { LowestPrices: [{ condition: "used", ListingPrice: { Amount: 100 } }, { condition: "new", ListingPrice: { Amount: 450 } }, { condition: "new", ListingPrice: { Amount: 420 } }] } } }), { price: 420, listPrice: null });
  assert.equal(mapCategory("wireless_display_on_website"), "electronics");
  assert.equal(mapCategory("beauty_display_on_website"), "beauty");
  assert.equal(mapCategory("automotive_display_on_website"), "other");
  assert.equal(mapCategory(null), null);
});

import { parseAsin } from "../src/lib/asin";
import { searchCatalog, fetchCatalogItem } from "../src/lib/providers/sp-api";

test("parses ASINs from codes and amazon.in links", () => {
  assert.deepEqual(parseAsin("b0abcdefgh"), { asin: "B0ABCDEFGH" });
  assert.deepEqual(parseAsin("https://www.amazon.in/Acme-Bottle/dp/B0ABCDEFGH/ref=sr_1_1?keywords=x"), { asin: "B0ABCDEFGH" });
  assert.deepEqual(parseAsin("https://www.amazon.in/gp/product/B0ABCDEFGH"), { asin: "B0ABCDEFGH" });
  assert.ok("error" in parseAsin("https://amzn.in/d/abc123"));
  assert.ok("error" in parseAsin("not a product"));
});

test("catalog search sends keywords and returns ranks", async () => {
  const urls: string[] = [];
  const f = (async (input: RequestInfo | URL) => {
    const url = String(input);
    urls.push(url);
    if (url.includes("auth/o2/token")) return new Response(JSON.stringify({ access_token: "t", expires_in: 3600 }));
    if (url.includes("/items/B0FASTSELL")) {
      return new Response(JSON.stringify({ asin: "B0FASTSELL", summaries: [{ marketplaceId: "A21TJRUUN4KGV", itemName: "Fast", brand: "Acme" }], salesRanks: [{ marketplaceId: "A21TJRUUN4KGV", displayGroupRanks: [{ rank: 120, title: "Home & Kitchen" }] }] }));
    }
    return new Response(
      JSON.stringify({
        numberOfResults: 2,
        pagination: { nextToken: "NEXT" },
        items: [
          { asin: "B0SLOWSELL", summaries: [{ marketplaceId: "A21TJRUUN4KGV", itemName: "Slow", websiteDisplayGroup: "kitchen_display_on_website" }], salesRanks: [{ marketplaceId: "A21TJRUUN4KGV", displayGroupRanks: [{ rank: 90000, title: "Home & Kitchen" }] }] },
          { asin: "B0FASTSELL", summaries: [{ marketplaceId: "A21TJRUUN4KGV", itemName: "Fast" }], salesRanks: [{ marketplaceId: "A21TJRUUN4KGV", displayGroupRanks: [{ rank: 120, title: "Home & Kitchen" }] }] },
        ],
      }),
    );
  }) as typeof fetch;
  const c = { clientId: "c", clientSecret: "s", refreshToken: "r", marketplaceId: "A21TJRUUN4KGV", endpoint: "https://sp.example", maxAsins: 40, fetch: f, sleep: async () => {} };
  const r = await searchCatalog(c, "air, fryer");
  const q = new URL(urls[1]).searchParams;
  assert.equal(q.get("keywords"), "air  fryer");
  assert.equal(q.get("includedData"), "summaries,salesRanks,images");
  assert.equal(q.get("pageSize"), "20");
  assert.equal(r.next, "NEXT");
  assert.deepEqual(r.items.map((i) => [i.asin, i.bsr, i.rankCategory]), [["B0SLOWSELL", 90000, "Home & Kitchen"], ["B0FASTSELL", 120, "Home & Kitchen"]]);
  const one = await fetchCatalogItem(c, "B0FASTSELL");
  assert.deepEqual([one.asin, one.title, one.brand, one.bsr], ["B0FASTSELL", "Fast", "Acme", 120]);
  assert.match(urls.at(-1)!, /\/catalog\/2022-04-01\/items\/B0FASTSELL\?marketplaceIds=A21TJRUUN4KGV&includedData=summaries,salesRanks,images/);
});
