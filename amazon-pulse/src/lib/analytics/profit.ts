/**
 * Per-unit profit model for an Amazon.in seller, with GST handled correctly.
 *
 * - The selling price shown on Amazon.in includes GST. Output GST belongs to
 *   the government, so the seller's revenue is SP / (1 + rate).
 * - A registered seller who claims input tax credit (ITC) recovers the GST
 *   paid on purchases and on Amazon's fees (18%). Recoverable tax is not an
 *   expense, so it is excluded. Without ITC, that tax is a real cost.
 * - TCS (Sec. 52 CGST) and TDS (Sec. 194-O) withheld by Amazon can be
 *   credited against tax liability. They affect cash flow, not profit, so
 *   they are reported separately.
 */

export const GST_ON_FEES_PCT = 18;
export const TCS_PCT = 0.5; // CGST+SGST/IGST TCS on net taxable value
export const TDS_194O_PCT = 0.1;

export interface ProfitInput {
  /** Customer-facing price on Amazon.in, GST inclusive. */
  sellingPrice: number;
  /** GST rate applicable to the product, in percent. */
  productGstPct: number;
  /** What you pay the supplier per unit, as invoiced (GST inclusive). */
  purchaseCost: number;
  /** GST rate on your purchase invoice, in percent. */
  purchaseGstPct: number;
  /** Shipping per unit, excluding any GST you can claim back. */
  shipping: number;
  /** Packaging per unit, excluding any GST you can claim back. */
  packaging: number;
  /** Other per-unit costs (ads, storage, returns provision…). */
  other: number;
  referralFeePct: number;
  closingFee: number;
  /** Registered under GST and claiming input tax credit. */
  claimsItc: boolean;
}

export interface ProfitResult {
  netSellingPrice: number;
  outputGst: number;
  netPurchaseCost: number;
  inputGstOnPurchase: number;
  referralFee: number;
  closingFee: number;
  amazonFees: number;
  gstOnFees: number;
  /** GST on fees that is a cost (only when ITC is not claimed). */
  gstOnFeesExpensed: number;
  grossProfit: number;
  netProfit: number;
  /** Net profit ÷ net (ex-GST) selling price × 100. */
  marginPct: number | null;
  /** Cash withheld by Amazon and creditable later — not an expense. */
  tcs: number;
  tds: number;
  breakEvenPurchaseCost: number | null;
}

const r2 = (x: number) => Math.round(x * 100) / 100;

export function calculateProfit(i: ProfitInput): ProfitResult {
  const netSellingPrice = i.sellingPrice / (1 + i.productGstPct / 100);
  const outputGst = i.sellingPrice - netSellingPrice;

  const purchaseExGst = i.purchaseCost / (1 + i.purchaseGstPct / 100);
  const inputGstOnPurchase = i.purchaseCost - purchaseExGst;
  const netPurchaseCost = i.claimsItc ? purchaseExGst : i.purchaseCost;

  // Amazon.in computes the referral fee on the GST-inclusive item price.
  const referralFee = (i.sellingPrice * i.referralFeePct) / 100;
  const amazonFees = referralFee + i.closingFee;
  const gstOnFees = (amazonFees * GST_ON_FEES_PCT) / 100;
  const gstOnFeesExpensed = i.claimsItc ? 0 : gstOnFees;

  const grossProfit = netSellingPrice - netPurchaseCost;
  const netProfit = netSellingPrice - netPurchaseCost - amazonFees - gstOnFeesExpensed - i.shipping - i.packaging - i.other;
  const marginPct = netSellingPrice > 0 ? (netProfit / netSellingPrice) * 100 : null;

  const maxNetPurchase = netSellingPrice - amazonFees - gstOnFeesExpensed - i.shipping - i.packaging - i.other;
  const breakEvenPurchaseCost = maxNetPurchase > 0 ? (i.claimsItc ? maxNetPurchase * (1 + i.purchaseGstPct / 100) : maxNetPurchase) : null;

  return {
    netSellingPrice: r2(netSellingPrice),
    outputGst: r2(outputGst),
    netPurchaseCost: r2(netPurchaseCost),
    inputGstOnPurchase: r2(inputGstOnPurchase),
    referralFee: r2(referralFee),
    closingFee: r2(i.closingFee),
    amazonFees: r2(amazonFees),
    gstOnFees: r2(gstOnFees),
    gstOnFeesExpensed: r2(gstOnFeesExpensed),
    grossProfit: r2(grossProfit),
    netProfit: r2(netProfit),
    marginPct: marginPct == null ? null : Math.round(marginPct * 10) / 10,
    tcs: r2((netSellingPrice * TCS_PCT) / 100),
    tds: r2((netSellingPrice * TDS_194O_PCT) / 100),
    breakEvenPurchaseCost: breakEvenPurchaseCost == null ? null : r2(breakEvenPurchaseCost),
  };
}
