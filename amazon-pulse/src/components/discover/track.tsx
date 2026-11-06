"use client";
import { useActionState } from "react";
import { Check, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trackProduct } from "@/app/(app)/discover/actions";

/** Paste an ASIN or link. */
export function TrackForm({ enabled }: { enabled: boolean }) {
  const [state, action, pending] = useActionState(trackProduct, {});
  return (
    <form action={action} className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="track-asin" className="sr-only">
          ASIN or amazon.in product link
        </label>
        <Input id="track-asin" name="asin" placeholder="B0XXXXXXXX or https://www.amazon.in/…/dp/B0XXXXXXXX" disabled={!enabled} className="h-10" />
        <Button type="submit" className="h-10" disabled={!enabled || pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Plus />} Track product
        </Button>
      </div>
      {state.error && <p role="alert" className="text-[13px] text-negative">{state.error}</p>}
      {state.ok && <p role="status" className="text-[13px] text-positive">{state.ok}</p>}
    </form>
  );
}

/** One-click tracking for a search result. */
export function TrackButton({ asin, tracked, enabled }: { asin: string; tracked: boolean; enabled: boolean }) {
  const [state, action, pending] = useActionState(trackProduct, {});
  if (tracked || state.ok)
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-positive">
        <Check className="size-3.5" /> Tracking
      </span>
    );
  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <input type="hidden" name="asin" value={asin} />
      <Button type="submit" size="sm" variant="outline" disabled={!enabled || pending} title={enabled ? "Track daily" : "Sign in (production) to track"}>
        {pending ? <Loader2 className="animate-spin" /> : <Plus />} Track
      </Button>
      {state.error && <span className="max-w-40 text-right text-[11px] text-negative">{state.error}</span>}
    </form>
  );
}
