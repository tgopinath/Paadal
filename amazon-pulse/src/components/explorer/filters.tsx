"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, NativeSelect } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { CATEGORIES } from "@/lib/categories";
import { SORT_LABELS, type SortKey } from "@/lib/analytics/explorer";

const FILTER_KEYS = ["cat", "sub", "pmin", "pmax", "rmin", "revmin", "revmax", "dmin", "demand", "trend", "updated"];

function useParamUpdater() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();
  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v == null || v === "") next.delete(k);
      else next.set(k, v);
    }
    if (!("page" in patch)) next.delete("page");
    start(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
  };
  return { sp, set, pending };
}

export function FilterFields({ subcategories }: { subcategories: Record<string, string[]> }) {
  const { sp, set } = useParamUpdater();
  const cat = sp.get("cat") ?? "";
  const field = (k: string) => sp.get(k) ?? "";
  return (
    <div className="grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="f-cat">Category</Label>
        <NativeSelect id="f-cat" value={cat} onChange={(e) => set({ cat: e.target.value, sub: null })}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="f-sub">Subcategory</Label>
        <NativeSelect id="f-sub" value={field("sub")} disabled={!cat} onChange={(e) => set({ sub: e.target.value })}>
          <option value="">{cat ? "All subcategories" : "Choose a category first"}</option>
          {(subcategories[cat] ?? []).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </NativeSelect>
      </div>
      <RangeField label="Price (₹)" minKey="pmin" maxKey="pmax" set={set} sp={sp} />
      <div className="grid gap-1.5">
        <Label htmlFor="f-rating">Minimum rating</Label>
        <NativeSelect id="f-rating" value={field("rmin")} onChange={(e) => set({ rmin: e.target.value })}>
          <option value="">Any rating</option>
          {["4.5", "4", "3.5", "3"].map((r) => (
            <option key={r} value={r}>
              {r}★ & up
            </option>
          ))}
        </NativeSelect>
      </div>
      <RangeField label="Review count" minKey="revmin" maxKey="revmax" set={set} sp={sp} />
      <div className="grid gap-1.5">
        <Label htmlFor="f-disc">Minimum discount</Label>
        <NativeSelect id="f-disc" value={field("dmin")} onChange={(e) => set({ dmin: e.target.value })}>
          <option value="">Any discount</option>
          {["10", "25", "40", "50"].map((d) => (
            <option key={d} value={d}>
              {d}% or more off list price
            </option>
          ))}
        </NativeSelect>
      </div>
      <fieldset className="grid gap-1.5">
        <legend className="mb-1.5 text-[13px] font-medium">Demand level</legend>
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["very_high", "Very high"],
              ["high", "High"],
              ["medium", "Medium"],
              ["low", "Low"],
            ] as const
          ).map(([v, l]) => {
            const current = field("demand").split(",").filter(Boolean);
            const on = current.includes(v);
            return (
              <button
                key={v}
                type="button"
                aria-pressed={on}
                onClick={() => set({ demand: (on ? current.filter((x) => x !== v) : [...current, v]).join(",") })}
                className={`h-8 rounded-full border px-3 text-xs ${on ? "border-primary bg-primary-soft text-primary" : "bg-white text-muted-foreground hover:text-foreground"}`}
              >
                {l}
              </button>
            );
          })}
        </div>
      </fieldset>
      <div className="grid gap-1.5">
        <Label htmlFor="f-trend">Trend direction (14 days)</Label>
        <NativeSelect id="f-trend" value={field("trend")} onChange={(e) => set({ trend: e.target.value })}>
          <option value="">Any trend</option>
          <option value="up">Rising</option>
          <option value="flat">Stable</option>
          <option value="down">Falling</option>
        </NativeSelect>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="f-updated">Last updated</Label>
        <NativeSelect id="f-updated" value={field("updated")} onChange={(e) => set({ updated: e.target.value })}>
          <option value="">Any time</option>
          <option value="1">Today</option>
          <option value="7">Within 7 days</option>
          <option value="30">Within 30 days</option>
        </NativeSelect>
      </div>
      <Button variant="ghost" size="sm" className="justify-self-start text-muted-foreground" onClick={() => set(Object.fromEntries(FILTER_KEYS.map((k) => [k, null])))}>
        Clear all filters
      </Button>
    </div>
  );
}

function RangeField({
  label,
  minKey,
  maxKey,
  set,
  sp,
}: {
  label: string;
  minKey: string;
  maxKey: string;
  set: (p: Record<string, string | null>) => void;
  sp: URLSearchParams;
}) {
  const [min, setMin] = useState(sp.get(minKey) ?? "");
  const [max, setMax] = useState(sp.get(maxKey) ?? "");
  useEffect(() => {
    const t = setTimeout(() => {
      if ((sp.get(minKey) ?? "") !== min || (sp.get(maxKey) ?? "") !== max) set({ [minKey]: min, [maxKey]: max });
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [min, max]);
  return (
    <fieldset className="grid gap-1.5">
      <legend className="mb-1.5 text-[13px] font-medium">{label}</legend>
      <div className="grid grid-cols-2 gap-2">
        <Input inputMode="numeric" placeholder="Min" aria-label={`${label} minimum`} value={min} onChange={(e) => setMin(e.target.value.replace(/[^\d.]/g, ""))} />
        <Input inputMode="numeric" placeholder="Max" aria-label={`${label} maximum`} value={max} onChange={(e) => setMax(e.target.value.replace(/[^\d.]/g, ""))} />
      </div>
    </fieldset>
  );
}

export function ExplorerToolbar({ total, activeFilters, subcategories }: { total: number; activeFilters: number; subcategories: Record<string, string[]> }) {
  const { sp, set, pending } = useParamUpdater();
  const [q, setQ] = useState(sp.get("q") ?? "");
  useEffect(() => {
    const t = setTimeout(() => {
      if ((sp.get("q") ?? "") !== q) set({ q });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);
  const view = sp.get("view") ?? "";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by name, ASIN, brand…" aria-label="Search products" className="h-9 w-full sm:w-72" />
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" className="2xl:hidden">
            <SlidersHorizontal /> Filters{activeFilters > 0 && <span className="tabular rounded-full bg-primary px-1.5 text-[11px] text-white">{activeFilters}</span>}
          </Button>
        </SheetTrigger>
        <SheetContent title="Filters" description={`${total} products match`} side="bottom">
          <div className="p-5">
            <FilterFields subcategories={subcategories} />
          </div>
        </SheetContent>
      </Sheet>
      <NativeSelect aria-label="Sort by" className="w-auto min-w-0 flex-1 sm:flex-none" value={sp.get("sort") ?? "demand"} onChange={(e) => set({ sort: e.target.value })}>
        {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
          <option key={k} value={k}>
            Sort: {SORT_LABELS[k]}
          </option>
        ))}
      </NativeSelect>
      <div role="radiogroup" aria-label="View" className="hidden h-9 items-center gap-0.5 rounded-md bg-surface-2 p-0.5 md:inline-flex">
        {[
          ["", "Table"],
          ["cards", "Cards"],
        ].map(([v, l]) => (
          <button
            key={v}
            role="radio"
            aria-checked={view === v}
            onClick={() => set({ view: v || null, page: sp.get("page") })}
            className={`h-8 rounded-[6px] px-3 text-[13px] font-medium ${view === v ? "bg-white shadow-sm" : "text-muted-foreground"}`}
          >
            {l}
          </button>
        ))}
      </div>
      <span aria-live="polite" className="text-[13px] text-muted-foreground">
        {pending ? "Updating…" : `${total.toLocaleString("en-IN")} products`}
      </span>
    </div>
  );
}
