"use server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { appMode } from "@/lib/data/repository";

export interface SavedCosts {
  sellingPrice: string;
  productGstPct: string;
  purchaseCost: string;
  purchaseGstPct: string;
  shipping: string;
  packaging: string;
  other: string;
  referralFeePct: string;
  closingFee: string;
  claimsItc: boolean;
  updatedAt?: string;
}

const ASIN = /^[A-Z0-9]{10}$/;
const num = (v: string, max: number) => {
  const n = Number(v);
  if (v === "" || !Number.isFinite(n) || n < 0 || n > max) throw new Error("Invalid number");
  return n;
};

async function context(asin: string) {
  if (appMode() !== "production" || !ASIN.test(asin)) return null;
  const user = await getCurrentUser();
  if (!user) return null;
  const [p] = await db()<{ id: string }[]>`SELECT id FROM products WHERE asin = ${asin}`;
  return p ? { userId: user.id, productId: p.id } : null;
}

export async function loadCosts(asin: string): Promise<SavedCosts | null> {
  const c = await context(asin);
  if (!c) return null;
  const [r] = await db()<
    {
      selling_price: number | null;
      product_gst_pct: number | null;
      purchase_cost: number;
      purchase_gst_pct: number;
      shipping: number;
      packaging: number;
      other: number;
      referral_fee_pct: number | null;
      closing_fee: number | null;
      claims_itc: boolean;
      updated_at: Date;
    }[]
  >`SELECT selling_price, product_gst_pct, purchase_cost, purchase_gst_pct, shipping, packaging, other,
           referral_fee_pct, closing_fee, claims_itc, updated_at
    FROM cost_profiles WHERE user_id = ${c.userId} AND product_id = ${c.productId}`;
  if (!r) return null;
  const s = (x: number | null) => (x == null ? "" : String(x));
  return {
    sellingPrice: s(r.selling_price),
    productGstPct: s(r.product_gst_pct),
    purchaseCost: s(r.purchase_cost),
    purchaseGstPct: s(r.purchase_gst_pct),
    shipping: s(r.shipping),
    packaging: s(r.packaging),
    other: s(r.other),
    referralFeePct: s(r.referral_fee_pct),
    closingFee: s(r.closing_fee),
    claimsItc: r.claims_itc,
    updatedAt: r.updated_at.toISOString(),
  };
}

export async function saveCosts(asin: string, v: SavedCosts): Promise<{ ok: boolean; error?: string }> {
  const c = await context(asin);
  if (!c) return { ok: false, error: "Sign in (production mode) to save costs." };
  try {
    const row = {
      user_id: c.userId,
      product_id: c.productId,
      selling_price: num(v.sellingPrice, 1e8),
      product_gst_pct: num(v.productGstPct, 28),
      purchase_cost: num(v.purchaseCost, 1e8),
      purchase_gst_pct: num(v.purchaseGstPct, 28),
      shipping: num(v.shipping, 1e7),
      packaging: num(v.packaging, 1e7),
      other: num(v.other, 1e7),
      referral_fee_pct: num(v.referralFeePct, 100),
      closing_fee: num(v.closingFee, 1e6),
      claims_itc: Boolean(v.claimsItc),
    };
    await db()`
      INSERT INTO cost_profiles ${db()(row)}
      ON CONFLICT (user_id, product_id) DO UPDATE SET
        selling_price = EXCLUDED.selling_price, product_gst_pct = EXCLUDED.product_gst_pct,
        purchase_cost = EXCLUDED.purchase_cost, purchase_gst_pct = EXCLUDED.purchase_gst_pct,
        shipping = EXCLUDED.shipping, packaging = EXCLUDED.packaging, other = EXCLUDED.other,
        referral_fee_pct = EXCLUDED.referral_fee_pct, closing_fee = EXCLUDED.closing_fee,
        claims_itc = EXCLUDED.claims_itc, updated_at = now()`;
    return { ok: true };
  } catch {
    return { ok: false, error: "Check the numbers: every field needs a valid, non-negative value." };
  }
}
