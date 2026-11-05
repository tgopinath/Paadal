"use client";
import * as React from "react";
import { Dialog } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Sheet = Dialog.Root;
export const SheetTrigger = Dialog.Trigger;
export const SheetClose = Dialog.Close;

export function SheetContent({
  side = "bottom",
  title,
  description,
  className,
  children,
}: {
  side?: "bottom" | "right" | "left";
  title: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-black/30 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
      <Dialog.Content
        className={cn(
          "fixed z-50 flex flex-col bg-white shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out",
          side === "bottom" && "inset-x-0 bottom-0 max-h-[88dvh] rounded-t-2xl pb-[env(safe-area-inset-bottom)] data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom",
          side === "right" && "inset-y-0 right-0 w-[min(420px,100vw)] data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right",
          side === "left" && "inset-y-0 left-0 w-[min(300px,85vw)] data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left",
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
          <div>
            <Dialog.Title className="text-base font-semibold">{title}</Dialog.Title>
            {description ? <Dialog.Description className="mt-0.5 text-[13px] text-muted-foreground">{description}</Dialog.Description> : <Dialog.Description className="sr-only">{title}</Dialog.Description>}
          </div>
          <Dialog.Close className="-mr-2 inline-flex size-9 items-center justify-center rounded-md hover:bg-surface" aria-label="Close">
            <X className="size-4" />
          </Dialog.Close>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </Dialog.Content>
    </Dialog.Portal>
  );
}
