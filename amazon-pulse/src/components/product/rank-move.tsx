import { ArrowDown, ArrowUp, Minus, Sparkles } from "lucide-react";

/** Movement between two period rankings. Up = better (smaller rank number). */
export function RankMove({ rank, previousRank }: { rank: number | null; previousRank: number | null }) {
  if (rank != null && previousRank == null)
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-primary">
        <Sparkles className="size-3" aria-hidden /> New
      </span>
    );
  if (rank == null || previousRank == null) return <span className="text-[11px] text-subtle-foreground">—</span>;
  const d = previousRank - rank;
  if (d === 0)
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground">
        <Minus className="size-3" aria-hidden />
        <span className="sr-only">No change</span>0
      </span>
    );
  return (
    <span className={`tabular inline-flex items-center gap-0.5 text-[11px] font-medium ${d > 0 ? "text-positive" : "text-negative"}`}>
      {d > 0 ? <ArrowUp className="size-3" aria-hidden /> : <ArrowDown className="size-3" aria-hidden />}
      <span className="sr-only">{d > 0 ? "Up" : "Down"}</span>
      {Math.abs(d)}
    </span>
  );
}
