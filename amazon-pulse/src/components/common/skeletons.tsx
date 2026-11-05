import { Skeleton } from "@/components/ui/skeleton";

export function OverviewSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading dashboard">
      <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 md:grid-cols-3 2xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-[172px] rounded-lg" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[3fr_2fr]">
        <Skeleton className="h-[380px] rounded-lg" />
        <Skeleton className="h-[380px] rounded-lg" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-2 rounded-lg border p-4" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-8 w-full" />
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

export function PanelSkeleton({ height = 320 }: { height?: number }) {
  return <Skeleton className="w-full rounded-lg" style={{ height }} />;
}
