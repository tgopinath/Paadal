"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Bell, BellOff, FolderPlus, Plus, Star, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Label, NativeSelect } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/states";
import { Sparkline } from "@/components/charts/sparkline";
import { Delta } from "@/components/common/delta";
import { actions, useStore, type AlertRule, type AlertType } from "@/lib/client-store";
import { formatINR, formatInt } from "@/lib/format";

export interface WatchItem {
  asin: string;
  title: string;
  category: string;
  price: number | null;
  previousPrice: number | null;
  bsr: number | null;
  rankChange7d: number | null;
  demand: number | null;
  demandDelta7d: number | null;
  trendScore: number | null;
  sparkline: (number | null)[];
}

const ALERT_LABEL: Record<AlertType, string> = {
  price_below: "Price drops below ₹",
  rank_better_than: "BSR better than #",
  trend_score_above: "Trend score above",
  demand_change_above: "Demand index changes by more than (pts, 7d)",
};

function evaluate(rule: AlertRule, item: WatchItem): boolean | null {
  switch (rule.type) {
    case "price_below":
      return item.price == null ? null : item.price < rule.threshold;
    case "rank_better_than":
      return item.bsr == null ? null : item.bsr < rule.threshold;
    case "trend_score_above":
      return item.trendScore == null ? null : item.trendScore > rule.threshold;
    case "demand_change_above":
      return item.demandDelta7d == null ? null : Math.abs(item.demandDelta7d) > rule.threshold;
  }
}

export function WatchlistView({ items }: { items: WatchItem[] }) {
  const { collections, alerts, hydrated } = useStore();
  const [active, setActive] = useState("all");
  const [newName, setNewName] = useState("");
  const byAsin = useMemo(() => new Map(items.map((i) => [i.asin, i])), [items]);

  if (!hydrated) return <Skeleton className="h-64 w-full rounded-lg" />;

  const watched = [...new Set(collections.flatMap((c) => c.asins))];
  const visible = (active === "all" ? watched : (collections.find((c) => c.id === active)?.asins ?? [])).map((a) => byAsin.get(a)).filter(Boolean) as WatchItem[];
  const triggered = alerts.filter((a) => a.enabled && byAsin.has(a.asin) && evaluate(a, byAsin.get(a.asin)!) === true);

  return (
    <div className="space-y-6">
      {triggered.length > 0 && (
        <Card className="border-primary/30 bg-primary-soft/50">
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="size-4 text-primary" /> {triggered.length} alert{triggered.length > 1 ? "s" : ""} triggered
              </CardTitle>
              <CardDescription>Checked against the latest snapshot when you opened this page.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5 text-[13px]">
              {triggered.map((a) => (
                <li key={a.id}>
                  <Link href={`/products/${a.asin}`} className="font-medium hover:text-primary">
                    {byAsin.get(a.asin)!.title}
                  </Link>{" "}
                  — {ALERT_LABEL[a.type]} {formatInt(a.threshold)}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant={active === "all" ? "default" : "outline"} onClick={() => setActive("all")}>
          All <span className="tabular opacity-70">{watched.length}</span>
        </Button>
        {collections.map((c) => (
          <span key={c.id} className="inline-flex items-center">
            <Button size="sm" variant={active === c.id ? "default" : "outline"} onClick={() => setActive(c.id)}>
              {c.name} <span className="tabular opacity-70">{c.asins.length}</span>
            </Button>
            {c.id !== "default" && active === c.id && (
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={`Delete collection ${c.name}`}
                onClick={() => {
                  if (confirm(`Delete the collection "${c.name}"? Products stay in your other collections.`)) {
                    actions.deleteCollection(c.id);
                    setActive("all");
                  }
                }}
              >
                <Trash2 />
              </Button>
            )}
          </span>
        ))}
        <form
          className="flex items-center gap-1"
          onSubmit={(e) => {
            e.preventDefault();
            if (!newName.trim()) return;
            setActive(actions.createCollection(newName));
            setNewName("");
          }}
        >
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New collection" aria-label="New collection name" className="h-8 w-40" />
          <Button size="icon-sm" variant="outline" type="submit" aria-label="Create collection">
            <FolderPlus />
          </Button>
        </form>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={Star}
          title={watched.length === 0 ? "Your watchlist is empty" : "This collection is empty"}
          description="Tap the star on any product to start tracking its price, rank and demand here."
          action={
            <Button asChild variant="outline">
              <Link href="/products">Find products</Link>
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {visible.map((i) => (
            <WatchCard key={i.asin} item={i} />
          ))}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">
        Your watchlist, collections and alerts are saved on this device. Once accounts are enabled, they sync to your account and alerts arrive by email or push.
      </p>
    </div>
  );
}

function WatchCard({ item }: { item: WatchItem }) {
  const { collections, alerts } = useStore();
  const [type, setType] = useState<AlertType>("price_below");
  const [threshold, setThreshold] = useState("");
  const mine = alerts.filter((a) => a.asin === item.asin);
  const priceChange = item.price != null && item.previousPrice ? ((item.price - item.previousPrice) / item.previousPrice) * 100 : null;
  return (
    <li>
      <Card className="h-full p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link href={`/products/${item.asin}`} className="line-clamp-2 text-sm font-medium hover:text-primary">
              {item.title}
            </Link>
            <p className="text-[11px] text-muted-foreground">
              <span className="font-mono">{item.asin}</span> · {item.category}
            </p>
          </div>
          <Button size="icon-sm" variant="ghost" aria-label="Remove from watchlist" onClick={() => actions.toggleWatch(item.asin)}>
            <Star className="fill-amber-400 text-amber-500" />
          </Button>
        </div>
        <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
          <div>
            <dt className="text-muted-foreground">Price (30d)</dt>
            <dd className="tabular font-medium">{formatINR(item.price)}</dd>
            <dd>
              <Delta value={priceChange} inverse />
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">BSR (7d)</dt>
            <dd className="tabular font-medium">{item.bsr != null ? `#${formatInt(item.bsr)}` : "—"}</dd>
            <dd className={`tabular ${item.rankChange7d == null || item.rankChange7d === 0 ? "text-muted-foreground" : item.rankChange7d > 0 ? "text-positive" : "text-negative"}`}>
              {item.rankChange7d == null ? "—" : `${item.rankChange7d > 0 ? "▲" : item.rankChange7d < 0 ? "▼" : "•"} ${formatInt(Math.abs(item.rankChange7d))}`}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Demand (7d)</dt>
            <dd className="tabular font-medium">{item.demand?.toFixed(1) ?? "—"}</dd>
            <dd>
              <Delta value={item.demandDelta7d} suffix=" pts" />
            </dd>
          </div>
        </dl>
        <div className="mt-2">
          <Sparkline data={item.sparkline} height={32} label="Demand, last 30 days" />
        </div>
        <details className="group mt-3 border-t pt-3">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-medium text-primary [&::-webkit-details-marker]:hidden">
            <Bell className="size-3.5" /> Alerts {mine.length > 0 && <Badge variant="neutral">{mine.length}</Badge>}
            <span className="ml-auto text-muted-foreground">Collections</span>
          </summary>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              {mine.map((a) => (
                <div key={a.id} className="flex items-center gap-1 text-xs">
                  <span className={`flex-1 ${a.enabled ? "" : "text-muted-foreground line-through"}`}>
                    {ALERT_LABEL[a.type]} {formatInt(a.threshold)}
                  </span>
                  <Button size="icon-sm" variant="ghost" aria-label={a.enabled ? "Pause alert" : "Resume alert"} onClick={() => actions.toggleAlert(a.id)}>
                    {a.enabled ? <Bell /> : <BellOff />}
                  </Button>
                  <Button size="icon-sm" variant="ghost" aria-label="Delete alert" onClick={() => actions.removeAlert(a.id)}>
                    <Trash2 />
                  </Button>
                </div>
              ))}
              <form
                className="grid gap-1.5"
                onSubmit={(e) => {
                  e.preventDefault();
                  const t = Number(threshold);
                  if (!Number.isFinite(t) || threshold === "") return;
                  actions.addAlert({ asin: item.asin, type, threshold: t });
                  setThreshold("");
                }}
              >
                <Label className="sr-only" htmlFor={`at-${item.asin}`}>
                  Alert type
                </Label>
                <NativeSelect id={`at-${item.asin}`} className="h-8 text-xs" value={type} onChange={(e) => setType(e.target.value as AlertType)}>
                  {(Object.keys(ALERT_LABEL) as AlertType[]).map((k) => (
                    <option key={k} value={k}>
                      {ALERT_LABEL[k].replace(/ [₹#]$/, "")}
                    </option>
                  ))}
                </NativeSelect>
                <div className="flex gap-1.5">
                  <Input className="h-8 text-xs" inputMode="decimal" placeholder="Threshold" aria-label="Threshold" value={threshold} onChange={(e) => setThreshold(e.target.value.replace(/[^\d.]/g, ""))} />
                  <Button size="sm" type="submit" variant="outline">
                    <Plus /> Add
                  </Button>
                </div>
              </form>
            </div>
            <fieldset className="space-y-1.5">
              <legend className="sr-only">Collections</legend>
              {collections.map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-xs">
                  <input type="checkbox" className="size-4 accent-[var(--primary)]" checked={c.asins.includes(item.asin)} onChange={(e) => actions.setInCollection(item.asin, c.id, e.target.checked)} />
                  {c.name}
                </label>
              ))}
            </fieldset>
          </div>
        </details>
      </Card>
    </li>
  );
}
