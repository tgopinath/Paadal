import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState, NoDataYet } from "@/components/common/states";
import { TableSkeleton } from "@/components/common/skeletons";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExplorerToolbar, FilterFields } from "@/components/explorer/filters";
import { ResultsCards, ResultsTable } from "@/components/explorer/results";
import { CompareTray } from "@/components/product/product-actions";
import { getData } from "@/lib/data/repository";
import { productSummaries } from "@/lib/analytics/engine";
import { filterProducts, sortProducts, type ExplorerParams, type SortKey, SORT_LABELS } from "@/lib/analytics/explorer";

export const metadata: Metadata = { title: "Product Explorer" };

const PAGE_SIZE = 24;

export default function ProductsPage({ searchParams }: { searchParams: Promise<ExplorerParams> }) {
  return (
    <>
      <PageHeader
        title="Product Explorer"
        description="Search, filter and sort every tracked product. Demand is an estimated index from Best Sellers Rank; competition is a proxy from review counts."
      />
      <Suspense fallback={<TableSkeleton />}>
        <Explorer searchParams={searchParams} />
      </Suspense>
      <CompareTray />
    </>
  );
}

async function Explorer({ searchParams }: { searchParams: Promise<ExplorerParams> }) {
  const params = await searchParams;
  const { ds } = await getData();
  if (ds.products.length === 0) return <NoDataYet />;
  const all = productSummaries(ds);
  const subcategories: Record<string, string[]> = {};
  for (const s of all) {
    const list = (subcategories[s.product.categoryId] ??= []);
    if (!list.includes(s.product.subcategory)) list.push(s.product.subcategory);
  }
  Object.values(subcategories).forEach((l) => l.sort());

  const sort = (params.sort && params.sort in SORT_LABELS ? params.sort : "demand") as SortKey;
  const rows = sortProducts(filterProducts(all, params, ds.today), sort);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const page = Math.min(pages, Math.max(1, Number(params.page) || 1));
  const visible = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const activeFilters = ["cat", "sub", "pmin", "pmax", "rmin", "revmin", "revmax", "dmin", "demand", "trend", "updated"].filter(
    (k) => params[k as keyof ExplorerParams],
  ).length;

  const pageHref = (p: number) => {
    const sp = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]);
    sp.set("page", String(p));
    return `/products?${sp.toString()}`;
  };

  return (
    <div className="grid gap-6 2xl:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="hidden 2xl:block">
        <Card className="sticky top-24 p-5">
          <h2 className="mb-4 text-sm font-semibold">Filters</h2>
          <FilterFields subcategories={subcategories} />
        </Card>
      </aside>
      <div className="min-w-0 space-y-4">
        <ExplorerToolbar total={rows.length} activeFilters={activeFilters} subcategories={subcategories} />
        {rows.length === 0 ? (
          <EmptyState
            title="No products match these filters"
            description="Try widening the price range, removing the demand level, or clearing the search."
            action={
              <Button asChild variant="outline">
                <Link href="/products">Clear all</Link>
              </Button>
            }
          />
        ) : (
          <>
            {params.view === "cards" ? (
              <ResultsCards rows={visible} />
            ) : (
              <>
                <div className="hidden md:block">
                  <ResultsTable rows={visible} />
                </div>
                <ResultsCards rows={visible} className="md:hidden" />
              </>
            )}
            {pages > 1 && (
              <nav aria-label="Pagination" className="flex items-center justify-between gap-2 text-sm">
                <span className="text-muted-foreground">
                  Page {page} of {pages}
                </span>
                <span className="flex gap-2">
                  <Button asChild variant="outline" size="sm" aria-disabled={page === 1} className={page === 1 ? "pointer-events-none opacity-50" : ""}>
                    <Link href={pageHref(page - 1)} scroll>
                      <ChevronLeft /> Previous
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm" aria-disabled={page === pages} className={page === pages ? "pointer-events-none opacity-50" : ""}>
                    <Link href={pageHref(page + 1)} scroll>
                      Next <ChevronRight />
                    </Link>
                  </Button>
                </span>
              </nav>
            )}
          </>
        )}
      </div>
    </div>
  );
}
