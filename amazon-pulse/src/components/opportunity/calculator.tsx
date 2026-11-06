"use client";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { loadCosts, saveCosts } from "@/app/(app)/opportunities/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, NativeSelect } from "@/components/ui/input";
import { calculateProfit, GST_ON_FEES_PCT, type ProfitInput } from "@/lib/analytics/profit";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface CalculatorProduct {
  asin: string;
  title: string;
  price: number;
  referralFeePct: number;
  closingFee: number;
  gstRatePct: number;
}

const GST_RATES = [0, 5, 12, 18, 28];

export function ProfitCalculator({ products, initialAsin, canSave = false }: { products: CalculatorProduct[]; initialAsin?: string; canSave?: boolean }) {
  const initial = products.find((p) => p.asin === initialAsin) ?? products[0];
  const fromProduct = (p: CalculatorProduct) => ({
    sellingPrice: String(p.price),
    productGstPct: String(p.gstRatePct),
    purchaseCost: String(Math.round(p.price * 0.4)),
    purchaseGstPct: String(p.gstRatePct),
    shipping: p.price < 500 ? "45" : p.price < 1500 ? "70" : "110",
    packaging: "15",
    other: "0",
    referralFeePct: String(p.referralFeePct),
    closingFee: String(p.closingFee),
  });
  const [asin, setAsin] = useState(initial?.asin ?? "");
  const [f, setF] = useState<Record<string, string>>(initial ? fromProduct(initial) : {});
  const [claimsItc, setClaimsItc] = useState(true);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saving, startSave] = useTransition();

  // Signed-in users get their saved costs for this product back.
  useEffect(() => {
    if (!canSave || !asin) return;
    let live = true;
    loadCosts(asin).then((saved) => {
      if (!live || !saved) return;
      const { claimsItc: itc, updatedAt, ...fields } = saved;
      setF((cur) => ({ ...cur, ...Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== "")) }));
      setClaimsItc(itc);
      setSaveMsg(updatedAt ? `Loaded your saved costs (${new Date(updatedAt).toLocaleDateString("en-IN")}).` : null);
    });
    return () => {
      live = false;
    };
  }, [asin, canSave]);

  const n = (k: string) => {
    const v = Number(f[k]);
    return Number.isFinite(v) && v >= 0 ? v : 0;
  };
  const input: ProfitInput = {
    sellingPrice: n("sellingPrice"),
    productGstPct: n("productGstPct"),
    purchaseCost: n("purchaseCost"),
    purchaseGstPct: n("purchaseGstPct"),
    shipping: n("shipping"),
    packaging: n("packaging"),
    other: n("other"),
    referralFeePct: n("referralFeePct"),
    closingFee: n("closingFee"),
    claimsItc,
  };
  // Cheap arithmetic; recomputing on every render is fine.
  const r = calculateProfit(input);
  const field = (k: string, label: string, hint?: string, prefix = "₹") => (
    <div className="grid gap-1.5">
      <Label htmlFor={`pc-${k}`}>{label}</Label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground">{prefix}</span>
        <Input
          id={`pc-${k}`}
          inputMode="decimal"
          className="pl-7"
          value={f[k] ?? ""}
          onChange={(e) => setF((s) => ({ ...s, [k]: e.target.value.replace(/[^\d.]/g, "") }))}
        />
      </div>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
  const gstSelect = (k: string, label: string) => (
    <div className="grid gap-1.5">
      <Label htmlFor={`pc-${k}`}>{label}</Label>
      <NativeSelect id={`pc-${k}`} value={f[k]} onChange={(e) => setF((s) => ({ ...s, [k]: e.target.value }))}>
        {GST_RATES.map((g) => (
          <option key={g} value={g}>
            {g}%
          </option>
        ))}
      </NativeSelect>
    </div>
  );

  return (
    <Card id="calculator" className="scroll-mt-24">
      <CardHeader>
        <div>
          <CardTitle>Profit calculator</CardTitle>
          <CardDescription>Per-unit estimate with GST handled correctly. Fee rates are editable estimates; check them against the current Amazon.in fee schedule.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
          <div className="space-y-5">
            <div className="grid gap-1.5">
              <Label htmlFor="pc-product">Start from a product</Label>
              <NativeSelect
                id="pc-product"
                value={asin}
                onChange={(e) => {
                  const p = products.find((x) => x.asin === e.target.value);
                  setAsin(e.target.value);
                  setSaveMsg(null);
                  if (p) setF(fromProduct(p));
                }}
              >
                {products.map((p) => (
                  <option key={p.asin} value={p.asin}>
                    {p.title}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <fieldset className="grid gap-4 sm:grid-cols-2">
              <legend className="mb-3 text-[13px] font-semibold">Selling</legend>
              {field("sellingPrice", "Expected selling price", "Customer price on Amazon.in, GST inclusive")}
              {gstSelect("productGstPct", "GST rate on the product")}
            </fieldset>
            <fieldset className="grid gap-4 sm:grid-cols-2">
              <legend className="mb-3 text-[13px] font-semibold">Your costs (per unit)</legend>
              {field("purchaseCost", "Purchase cost", "As invoiced by your supplier, GST inclusive")}
              {gstSelect("purchaseGstPct", "GST rate on the purchase invoice")}
              {field("shipping", "Shipping", "Excluding any GST you claim back")}
              {field("packaging", "Packaging", "Excluding any GST you claim back")}
              {field("other", "Other expenses", "Ads, storage, returns provision…")}
            </fieldset>
            <fieldset className="grid gap-4 sm:grid-cols-2">
              <legend className="mb-3 text-[13px] font-semibold">Amazon fees (estimate)</legend>
              {field("referralFeePct", "Referral fee", "% of the GST-inclusive price", "%")}
              {field("closingFee", "Closing fee", "Per unit, by price band")}
            </fieldset>
            <label className="flex items-start gap-3 rounded-md border p-3">
              <input type="checkbox" className="mt-0.5 size-4 accent-[var(--primary)]" checked={claimsItc} onChange={(e) => setClaimsItc(e.target.checked)} />
              <span className="text-[13px]">
                <span className="font-medium">GST registered and claiming input tax credit</span>
                <span className="block text-muted-foreground">
                  GST on purchases and the {GST_ON_FEES_PCT}% GST on Amazon fees is recoverable, so it isn&apos;t counted as an expense. Untick if you can&apos;t claim ITC.
                </span>
              </span>
            </label>
            {canSave && (
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  disabled={saving}
                  onClick={() =>
                    startSave(async () => {
                      const r = await saveCosts(asin, {
                        sellingPrice: f.sellingPrice ?? "",
                        productGstPct: f.productGstPct ?? "",
                        purchaseCost: f.purchaseCost ?? "",
                        purchaseGstPct: f.purchaseGstPct ?? "",
                        shipping: f.shipping ?? "",
                        packaging: f.packaging ?? "",
                        other: f.other ?? "",
                        referralFeePct: f.referralFeePct ?? "",
                        closingFee: f.closingFee ?? "",
                        claimsItc,
                      });
                      setSaveMsg(r.ok ? "Saved. These costs load next time you open this product." : (r.error ?? "Couldn't save."));
                    })
                  }
                >
                  {saving ? "Saving…" : "Save my costs for this product"}
                </Button>
                {saveMsg && (
                  <span role="status" className="text-[13px] text-muted-foreground">
                    {saveMsg}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className={cn("rounded-lg p-5", r.netProfit >= 0 ? "bg-positive-soft" : "bg-negative-soft")}>
              <p className="text-[13px] text-muted-foreground">Estimated net profit per unit</p>
              <p className={cn("tabular mt-1 text-3xl font-semibold", r.netProfit >= 0 ? "text-positive" : "text-negative")}>{formatINR(r.netProfit, true)}</p>
              <p className="tabular mt-1 text-sm">
                Margin {r.marginPct == null ? "—" : `${r.marginPct.toFixed(1)}%`} <span className="text-muted-foreground">of net (ex-GST) selling price</span>
              </p>
            </div>
            <dl className="divide-y rounded-lg border text-[13px]">
              <Row label="Selling price (incl. GST)" value={formatINR(input.sellingPrice, true)} />
              <Row label="− Output GST (paid to government)" value={formatINR(r.outputGst, true)} muted />
              <Row label="Net selling price" value={formatINR(r.netSellingPrice, true)} strong />
              <Row label={`− Purchase cost${claimsItc ? " (ex-GST)" : " (incl. GST)"}`} value={formatINR(r.netPurchaseCost, true)} />
              <Row label="Gross profit" value={formatINR(r.grossProfit, true)} strong />
              <Row label={`− Referral fee (${input.referralFeePct}%)`} value={formatINR(r.referralFee, true)} />
              <Row label="− Closing fee" value={formatINR(r.closingFee, true)} />
              {!claimsItc && <Row label={`− GST on fees (${GST_ON_FEES_PCT}%, not recoverable)`} value={formatINR(r.gstOnFeesExpensed, true)} />}
              <Row label="− Shipping, packaging, other" value={formatINR(input.shipping + input.packaging + input.other, true)} />
              <Row label="Estimated net profit" value={formatINR(r.netProfit, true)} strong />
            </dl>
            <dl className="rounded-lg bg-surface p-4 text-[12px] text-muted-foreground">
              <p className="mb-2 font-medium text-foreground">Not expenses: tracked for cash flow</p>
              {claimsItc && <Row label="Input GST on purchase (ITC)" value={formatINR(r.inputGstOnPurchase, true)} plain />}
              {claimsItc && <Row label="GST on Amazon fees (ITC)" value={formatINR(r.gstOnFees, true)} plain />}
              <Row label="TCS withheld by Amazon (0.5%, creditable)" value={formatINR(r.tcs, true)} plain />
              <Row label="TDS u/s 194-O (0.1%, creditable)" value={formatINR(r.tds, true)} plain />
              <Row label="Break-even purchase cost (as invoiced)" value={r.breakEvenPurchaseCost == null ? "Not profitable at any cost" : formatINR(r.breakEvenPurchaseCost, true)} plain />
            </dl>
            <p className="text-[11px] leading-relaxed text-subtle-foreground">
              Estimate only, not tax advice. Weight handling (Easy Ship / FBA) fees vary by size and region and belong in Shipping. Confirm GST rates and fees with your accountant and Amazon Seller Central.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Row({ label, value, strong, muted, plain }: { label: string; value: string; strong?: boolean; muted?: boolean; plain?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between gap-3", plain ? "py-1" : "px-4 py-2.5", strong && "font-semibold", muted && "text-muted-foreground")}>
      <dt>{label}</dt>
      <dd className="tabular text-right">{value}</dd>
    </div>
  );
}
