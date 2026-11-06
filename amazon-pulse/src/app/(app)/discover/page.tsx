import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { Info, KeyRound, Search } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/states";
import { TableSkeleton } from "@/components/common/skeletons";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DemandBadge } from "@/components/product/badges";
import { TrackButton, TrackForm } from "@/components/discover/track";
import { appMode } from "@/lib/data/repository";
import { db, hasDatabase } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { bsrToDemandIndex, demandLevel } from "@/lib/analytics/demand";
import { categoryName } from "@/lib/categories";
import { searchCatalog, spApiConfigFromEnv, spApiConfigured, type DiscoveredProduct } from "@/lib/providers/sp-api";

export const metadata: Metadata = { title: "Discover" };

type Params = { q?: string; t?: string };

export default function DiscoverPage({ searchParams }: { searchParams: Promise<Params> }) {
  return (
    <>
      <PageHeader
        title="Discover products"
        description="Search the Amazon.in catalog by keyword and see which matching products have the highest demand right now, ranked by Best Sellers Rank. Track the promising ones to follow their price and trend every day."
      />
      <Suspense fallback={<TableSkeleton rows={6} />}>
        <Discover searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Discover({ searchParams }: { searchParams: Promise<Params> }) {
  const { q = "", t } = await searchParams;
  await connection();
  const connected = spApiConfigured();
  const canTrack = appMode() === "production" && hasDatabase() && !!(await getCurrentUser());
  const query = q.trim().slice(0, 120);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Find high-demand products</CardTitle>
            <CardDescription>Type a product idea, for example &ldquo;air fryer&rdquo;, &ldquo;car air freshener&rdquo; or &ldquo;yoga mat&rdquo;.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form action="/discover" role="search" className="flex flex-col gap-2 sm:flex-row">
            <label htmlFor="disc-q" className="sr-only">
              Product keywords
            </label>
            <Input id="disc-q" name="q" defaultValue={query} placeholder="Product idea or keywords" className="h-10" maxLength={120} />
            <Button type="submit" className="h-10" disabled={!connected}>
              <Search /> Search Amazon.in
            </Button>
          </form>
        </CardContent>
      </Card>

      {!connected ? (
        <EmptyState
          icon={KeyRound}
          title="Connect your seller account to search Amazon.in"
          description={
            <>
              Discovery uses Amazon&apos;s official catalog search through the Selling Partner API. Add SPAPI_LWA_CLIENT_ID, SPAPI_LWA_CLIENT_SECRET and SPAPI_REFRESH_TOKEN in Vercel (steps in
              docs/HANDOFF.md, 4A), then redeploy. Amazon Pulse never scrapes Amazon&apos;s website.
            </>
          }
          action={
            <Button asChild variant="outline">
              <Link href="/data-sources">Open Data Sources</Link>
            </Button>
          }
        />
      ) : query ? (
        <Results query={query} pageToken={t} canTrack={canTrack} />
      ) : null}

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Track a product</CardTitle>
            <CardDescription>Paste an ASIN or an amazon.in product link, such as a competitor&apos;s listing. It joins the daily collection and your watchlist.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <TrackForm enabled={canTrack} />
          {!canTrack && <p className="mt-2 text-xs text-muted-foreground">Tracking needs production mode and a signed-in account.</p>}
        </CardContent>
      </Card>
    </div>
  );
}

async function Results({ query, pageToken, canTrack }: { query: string; pageToken?: string; canTrack: boolean }) {
  let res: { items: DiscoveredProduct[]; total: number; next: string | null };
  try {
    res = await searchCatalog(spApiConfigFromEnv(), query, pageToken);
  } catch (e) {
    const msg = (e as Error).message;
    return (
      <EmptyState
        icon={Info}
        title="Amazon's catalog search didn't answer"
        description={msg.startsWith("Login with Amazon") ? msg : "The Selling Partner API returned an error. Try again in a minute; if it keeps failing, check the app's roles in Seller Central."}
      />
    );
  }
  const tracked = new Set<string>();
  if (hasDatabase() && res.items.length) {
    const rows = await db()<{ asin: string }[]>`SELECT asin FROM products WHERE asin = ANY(${res.items.map((i) => i.asin)}::text[])`;
    rows.forEach((r) => tracked.add(r.asin));
  }
  // Lower BSR = higher demand. Products without a rank go last.
  const items = [...res.items].sort((a, b) => (a.bsr ?? Infinity) - (b.bsr ?? Infinity));
  if (!items.length) return <EmptyState title="No products found" description="Try fewer or simpler words, in English." />;

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div>
          <CardTitle>
            Highest demand for &ldquo;{query}&rdquo;
          </CardTitle>
          <CardDescription>
            {res.total.toLocaleString("en-IN")} matching products on Amazon.in; showing {items.length}, sorted by today&apos;s Best Sellers Rank. Ranks are within each product&apos;s own category, so compare
            products in the same category. Demand is an estimate from rank, not sales.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-0 sm:px-0">
        <ol className="divide-y">
          {items.map((it, i) => {
            const demand = it.bsr != null ? bsrToDemandIndex(it.bsr) : null;
            return (
              <li key={it.asin} className="flex items-center gap-3 px-5 py-3 sm:px-6">
                <span className="tabular w-6 text-right text-sm text-muted-foreground">{i + 1}</span>
                {it.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.imageUrl} alt="" width={48} height={48} className="size-12 shrink-0 rounded-md border bg-white object-contain" loading="lazy" />
                ) : (
                  <span className="size-12 shrink-0 rounded-md border bg-surface" />
                )}
                <div className="min-w-0 flex-1">
                  <a href={`https://www.amazon.in/dp/${it.asin}`} target="_blank" rel="noopener noreferrer" className="line-clamp-2 text-sm font-medium hover:text-primary">
                    {it.title ?? it.asin}
                  </a>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    <span className="font-mono">{it.asin}</span>
                    {it.brand && <> · {it.brand}</>}
                    {it.categoryId && <> · {categoryName(it.categoryId)}</>}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                    {it.bsr != null ? (
                      <span className="tabular">
                        #{it.bsr.toLocaleString("en-IN")} in {it.rankCategory ?? "category"}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">No Best Sellers Rank</span>
                    )}
                    <DemandBadge level={demandLevel(demand)} value={demand} />
                  </p>
                </div>
                <TrackButton asin={it.asin} tracked={tracked.has(it.asin)} enabled={canTrack} />
              </li>
            );
          })}
        </ol>
        {res.next && (
          <div className="border-t px-5 py-3 sm:px-6">
            <Button asChild variant="outline" size="sm">
              <Link href={`/discover?q=${encodeURIComponent(query)}&t=${encodeURIComponent(res.next)}`}>Next 20 results</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
