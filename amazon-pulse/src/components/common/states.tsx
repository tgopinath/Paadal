import { AlertTriangle, CalendarX2, Info, SearchX } from "lucide-react";
import type { Coverage } from "@/lib/types";
import { formatDay } from "@/lib/dates";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  action,
  icon: Icon = SearchX,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-lg border border-dashed bg-surface/40 px-6 py-12 text-center", className)}>
      <span className="mb-3 grid size-11 place-items-center rounded-full bg-surface-2 text-muted-foreground">
        <Icon className="size-5" />
      </span>
      <p className="font-medium">{title}</p>
      {description && <p className="mt-1 max-w-md text-[13px] text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Shown whenever a period has no snapshots. Never replaced by current data. */
export function NoHistory({ label, firstSnapshot, className }: { label: string; firstSnapshot: string | null; className?: string }) {
  return (
    <EmptyState
      icon={CalendarX2}
      className={className}
      title="Historical data not available"
      description={
        <>
          No snapshots were collected for {label}.{" "}
          {firstSnapshot ? <>Collection started on {formatDay(firstSnapshot)}, so earlier periods can&apos;t be reported.</> : <>No snapshots have been collected yet.</>}{" "}
          Amazon Pulse never fills gaps with today&apos;s data.
        </>
      }
    />
  );
}

export function CoverageNote({ coverage, label }: { coverage: Coverage; label?: string }) {
  if (coverage.status === "full") return null;
  const none = coverage.status === "none";
  return (
    <p className={cn("flex items-start gap-2 rounded-md px-3 py-2 text-[13px]", none ? "bg-surface text-muted-foreground" : "bg-warning-soft text-warning")}>
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>
        {label ? `${label}: ` : ""}
        {none
          ? "no snapshots in this period."
          : `partial data — ${coverage.coveredDays} of ${coverage.totalDays} days have snapshots (${formatDay(coverage.firstCovered!)} to ${formatDay(coverage.lastCovered!)}). Averages use covered days only.`}
      </span>
    </p>
  );
}

export function ErrorState({ title, message, action }: { title: string; message: string; action?: React.ReactNode }) {
  return (
    <div role="alert" className="flex flex-col items-center rounded-lg border border-red-200 bg-negative-soft/60 px-6 py-12 text-center">
      <AlertTriangle className="mb-3 size-6 text-negative" />
      <p className="font-medium">{title}</p>
      <p className="mt-1 max-w-lg text-[13px] text-muted-foreground">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
