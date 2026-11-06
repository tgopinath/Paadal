"use client";
import Link from "next/link";
import { GitCompareArrows, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { actions, MAX_COMPARE, useStore } from "@/lib/client-store";
import { cn } from "@/lib/utils";

export function WatchButton({ asin, withLabel = false, className }: { asin: string; withLabel?: boolean; className?: string }) {
  const { collections, hydrated } = useStore();
  const watched = hydrated && collections.some((c) => c.asins.includes(asin));
  return (
    <Button
      type="button"
      variant={withLabel ? "outline" : "ghost"}
      size={withLabel ? "sm" : "icon-sm"}
      aria-pressed={watched}
      aria-label={watched ? "Remove from watchlist" : "Add to watchlist"}
      title={watched ? "Remove from watchlist" : "Add to watchlist"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        actions.toggleWatch(asin);
      }}
      className={className}
    >
      <Star className={cn(watched ? "fill-amber-400 text-amber-500" : "text-muted-foreground")} />
      {withLabel && (watched ? "Watching" : "Watch")}
    </Button>
  );
}

export function CompareToggle({ asin, withLabel = false }: { asin: string; withLabel?: boolean }) {
  const { compare, hydrated } = useStore();
  const on = hydrated && compare.includes(asin);
  const full = hydrated && !on && compare.length >= MAX_COMPARE;
  return (
    <Button
      type="button"
      variant={withLabel ? "outline" : "ghost"}
      size={withLabel ? "sm" : "icon-sm"}
      aria-pressed={on}
      disabled={full}
      title={full ? `You can compare up to ${MAX_COMPARE} products` : on ? "Remove from comparison" : "Add to comparison"}
      aria-label={on ? "Remove from comparison" : "Add to comparison"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        actions.toggleCompare(asin);
      }}
    >
      <GitCompareArrows className={cn(on ? "text-primary" : "text-muted-foreground")} />
      {withLabel && (on ? "In comparison" : "Compare")}
    </Button>
  );
}

/** Floating tray shown while products are queued for comparison. */
export function CompareTray() {
  const { compare, hydrated } = useStore();
  if (!hydrated || compare.length === 0) return null;
  return (
    <div className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-30 flex justify-center px-4 lg:bottom-6">
      <div className="flex items-center gap-3 rounded-full border bg-white py-1.5 pl-4 pr-1.5 shadow-lg">
        <span className="text-sm">
          <strong className="tabular">{compare.length}</strong>
          <span className="text-muted-foreground"> / {MAX_COMPARE} selected</span>
        </span>
        <Button variant="ghost" size="icon-sm" aria-label="Clear comparison" onClick={() => actions.setCompare([])}>
          <X />
        </Button>
        <Button asChild size="sm" className="rounded-full">
          <Link href={`/compare?asins=${compare.join(",")}`}>
            <GitCompareArrows /> Compare
          </Link>
        </Button>
      </div>
    </div>
  );
}
