import { Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getData } from "@/lib/data/repository";
import { formatDay } from "@/lib/dates";

const SOURCE_LABEL: Record<string, string> = {
  demo: "Demo data",
  pa_api: "Product Advertising API",
  sp_api: "Selling Partner API",
  licensed: "Licensed provider",
  csv: "CSV import",
};

export async function DataFreshness() {
  const { lastSnapshot, firstSnapshot, sources } = await getData();
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <Clock className="size-3.5" aria-hidden />
        {lastSnapshot ? <>Latest snapshot {formatDay(lastSnapshot)}</> : "No snapshots yet"}
        {firstSnapshot && <span className="hidden sm:inline">· history since {formatDay(firstSnapshot)}</span>}
      </span>
      {sources.map((s) => (
        <Badge key={s} variant={s === "demo" ? "warning" : "neutral"}>
          {SOURCE_LABEL[s] ?? s}
        </Badge>
      ))}
    </div>
  );
}
