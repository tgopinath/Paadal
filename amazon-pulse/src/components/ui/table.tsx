import * as React from "react";
import { cn } from "@/lib/utils";

export function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div className="relative w-full overflow-x-auto">
      <table className={cn("w-full caption-bottom text-sm", className)} {...props} />
    </div>
  );
}
export function THead({ className, ...props }: React.ComponentProps<"thead">) {
  return <thead className={cn("bg-surface text-xs text-muted-foreground [&_tr]:border-b", className)} {...props} />;
}
export function TBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props} />;
}
export function TR({ className, ...props }: React.ComponentProps<"tr">) {
  return <tr className={cn("border-b transition-colors hover:bg-surface/60", className)} {...props} />;
}
export function TH({ className, ...props }: React.ComponentProps<"th">) {
  return <th className={cn("h-10 whitespace-nowrap px-3 text-left align-middle font-medium first:pl-5 last:pr-5", className)} {...props} />;
}
export function TD({ className, ...props }: React.ComponentProps<"td">) {
  return <td className={cn("px-3 py-3 align-middle first:pl-5 last:pr-5", className)} {...props} />;
}
