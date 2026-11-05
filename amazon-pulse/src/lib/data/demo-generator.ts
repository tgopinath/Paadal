/**
 * Deterministic synthetic dataset for demo mode.
 *
 * Everything here is invented: brands, ASINs (all start with "B0DEMO"),
 * prices, ranks and reviews. The generator imitates the *shape* of real
 * marketplace data (seasonality, sale events, review growth, a collection
 * outage) so the product experience can be evaluated before live data is
 * connected. It must never run in production mode (see repository.ts).
 */
import { addDays, diffDays, eachDay, parseISO } from "../dates";
import type { ISODate, Product, Snapshot } from "../types";
import { DEMO_BRANDS, DEMO_TEMPLATES, type Season } from "./demo-catalog";
import { bsrToDemandIndex } from "../analytics/demand";

/** First day the (simulated) collector ran. Nothing exists before this. */
export const DEMO_HISTORY_START: ISODate = "2025-03-01";

/** Simulated collector outage: no snapshots exist for these days. */
export const DEMO_OUTAGE: { start: ISODate; end: ISODate } = { start: "2025-08-11", end: "2025-08-14" };

const SALE_EVENTS: { start: ISODate; end: ISODate; strength: number }[] = [
  { start: "2025-07-12", end: "2025-07-14", strength: 1 },
  { start: "2025-09-23", end: "2025-10-22", strength: 0.8 },
  { start: "2026-07-11", end: "2026-07-13", strength: 1 },
  { start: "2026-10-01", end: "2026-10-30", strength: 0.8 },
];

const FESTIVAL_PEAKS: Record<"diwali" | "holi", ISODate[]> = {
  diwali: ["2025-10-20", "2026-11-08", "2027-10-29"],
  holi: ["2025-03-14", "2026-03-04", "2027-03-22"],
};

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function gaussian(rng: () => number): number {
  const u = Math.max(rng(), 1e-9);
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function bump(distanceDays: number, sigma: number): number {
  return Math.exp(-(distanceDays * distanceDays) / (2 * sigma * sigma));
}

function dayOfYearDistance(date: ISODate, month: number, day: number): number {
  const y = Number(date.slice(0, 4));
  let best = Infinity;
  for (const yy of [y - 1, y, y + 1]) {
    const peak = `${yy}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    best = Math.min(best, Math.abs(diffDays(date, peak)));
  }
  return best;
}

function seasonStrength(season: Season, date: ISODate): number {
  switch (season) {
    case "diwali":
    case "holi": {
      const sigma = season === "diwali" ? 16 : 7;
      const dist = Math.min(...FESTIVAL_PEAKS[season].map((p) => Math.abs(diffDays(date, p))));
      return bump(dist, sigma);
    }
    case "summer":
      return bump(dayOfYearDistance(date, 5, 1), 38);
    case "monsoon":
      return bump(dayOfYearDistance(date, 7, 20), 32);
    case "winter":
      return bump(dayOfYearDistance(date, 12, 28), 32);
    case "school":
      return Math.max(bump(dayOfYearDistance(date, 6, 10), 16), 0.6 * bump(dayOfYearDistance(date, 4, 1), 10));
    default:
      return 0;
  }
}

function saleStrength(date: ISODate): number {
  for (const e of SALE_EVENTS) if (date >= e.start && date <= e.end) return e.strength;
  return 0;
}

function niceINR(x: number): number {
  // Indian retail pricing usually ends in 9.
  return Math.max(99, Math.round(x / 10) * 10 - 1);
}

const ASIN_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export interface DemoDataset {
  products: Product[];
  snapshots: Map<string, Snapshot[]>;
  today: ISODate;
}

export function generateDemoDataset(today: ISODate): DemoDataset {
  const products: Product[] = [];
  const snapshots = new Map<string, Snapshot[]>();
  const days = eachDay(DEMO_HISTORY_START, today);

  DEMO_TEMPLATES.forEach((tpl, i) => {
    const rng = mulberry32(hashString(`amazon-pulse-demo-${i}-${tpl.name}`));
    const brand = DEMO_BRANDS[Math.floor(rng() * DEMO_BRANDS.length)];
    let asin = "B0DEMO";
    for (let k = 0; k < 4; k++) asin += ASIN_CHARS[Math.floor(rng() * ASIN_CHARS.length)];

    // A handful of products launch later; some of those take off quickly.
    const lateLaunch = rng() < 0.12;
    const firstSeen = lateLaunch ? addDays(today, -Math.floor(40 + rng() * 200)) : DEMO_HISTORY_START;

    const baseLog = 2.1 + rng() * 2.5 + (rng() < 0.2 ? -0.5 : 0); // ~ rank 25 – 40,000
    let trendPerYear = (rng() - 0.5) * 0.7; // log10 rank units per year; negative = improving
    if (lateLaunch) trendPerYear = -1.4 - rng() * 1.2;
    const season = tpl.season ?? "none";
    const seasonAmp = season === "none" ? 0 : 0.45 + rng() * 0.5;
    const priceBase = niceINR(tpl.priceMin + rng() * (tpl.priceMax - tpl.priceMin));
    const listMult = 1.3 + rng() * 0.8;
    let rating = Math.round((3.5 + rng() * 1.2) * 10) / 10;
    let reviews = lateLaunch ? Math.floor(rng() * 20) : Math.floor(Math.pow(10, 1.8 + (4.6 - baseLog) * 0.7 + rng() * 0.8));

    const product: Product = {
      id: `demo-${asin}`,
      asin,
      title: `${brand} ${tpl.name}`,
      brand,
      categoryId: tpl.categoryId,
      subcategory: tpl.subcategory,
      imageUrl: null,
      amazonUrl: null,
      firstSeen,
    };
    products.push(product);

    const series: Snapshot[] = [];
    let noise = 0;
    let priceLevel = 1;
    let nextPriceChange = 20 + Math.floor(rng() * 40);

    for (const date of days) {
      // Advance the random state every day, so a product's series does not
      // depend on its launch date.
      const n1 = gaussian(rng);
      const n2 = rng();
      const n3 = rng();
      if (date < firstSeen) continue;
      if (date >= DEMO_OUTAGE.start && date <= DEMO_OUTAGE.end) continue;

      const t = diffDays(date, DEMO_HISTORY_START) / 365;
      const age = diffDays(date, firstSeen);
      noise = 0.85 * noise + 0.07 * n1;
      const sale = saleStrength(date);
      const weekend = [0, 6].includes(parseISO(date).getUTCDay()) ? -0.03 : 0;
      // New listings start obscure and climb.
      const launchPenalty = lateLaunch ? Math.max(0, 1.2 - age / 45) : 0;

      let logRank =
        baseLog + (lateLaunch ? trendPerYear * (age / 365) : trendPerYear * t) - seasonAmp * seasonStrength(season, date) - 0.25 * sale + weekend + noise + launchPenalty;
      // Soft floor: the very top ranks are hard to reach and noisy, not pinned.
      if (logRank < 1.3) logRank = 1.3 - 0.9 * (1 - Math.exp(-(1.3 - logRank) / 0.9));
      logRank = Math.min(logRank + (logRank < 1.6 ? 0.12 * n1 : 0), 5.6);
      const bsr = Math.max(1, Math.round(Math.pow(10, logRank)));

      if (--nextPriceChange <= 0) {
        priceLevel = Math.min(1.15, Math.max(0.82, priceLevel * (1 + (n2 - 0.5) * 0.14)));
        nextPriceChange = 25 + Math.floor(n3 * 50);
      }
      const saleDiscount = sale > 0 ? 0.1 + 0.12 * sale : 0;
      const price = niceINR(priceBase * priceLevel * (1 - saleDiscount));
      const listPrice = niceINR(priceBase * listMult);

      reviews += Math.round(Math.pow(5000 / bsr, 0.7) * (0.5 + n2));
      if (n3 < 0.01) rating = Math.round(Math.min(4.8, Math.max(3.2, rating + (n2 - 0.5) * 0.2)) * 10) / 10;

      series.push({
        date,
        price,
        listPrice,
        rating: reviews > 0 ? rating : null,
        reviewCount: reviews,
        bsr,
        demandIndex: bsrToDemandIndex(bsr),
        source: "demo",
      });
    }
    snapshots.set(product.id, series);
  });

  return { products, snapshots, today };
}
