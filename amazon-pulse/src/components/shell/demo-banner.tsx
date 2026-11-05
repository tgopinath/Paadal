import Link from "next/link";
import { FlaskConical } from "lucide-react";
import { Suspense } from "react";
import { connection } from "next/server";
import { appMode } from "@/lib/data/repository";

export function DemoBanner() {
  return (
    <Suspense fallback={null}>
      <DemoBannerInner />
    </Suspense>
  );
}

/** Reads APP_MODE at request time so the deployed setting always wins. */
async function DemoBannerInner() {
  await connection();
  if (appMode() !== "demo") return null;
  return (
    <div role="note" className="border-b border-amber-200 bg-warning-soft px-4 py-2 text-[13px] text-warning sm:px-6 lg:px-8">
      <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <FlaskConical className="size-4 shrink-0" aria-hidden />
        <strong className="font-semibold">Demo data.</strong>
        <span>
          Every product, price, rank and review count here is synthetic. It shows how the product works, not real market data.
        </span>
        <Link href="/data-sources" className="font-medium underline underline-offset-2">
          Connect a data source
        </Link>
      </span>
    </div>
  );
}
