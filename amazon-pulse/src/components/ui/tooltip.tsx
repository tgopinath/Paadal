"use client";
import * as React from "react";
import { Tooltip as T } from "radix-ui";

export function InfoTip({ content, children }: { content: React.ReactNode; children: React.ReactNode }) {
  return (
    <T.Provider delayDuration={150}>
      <T.Root>
        <T.Trigger asChild>{children}</T.Trigger>
        <T.Portal>
          <T.Content sideOffset={6} className="z-50 max-w-72 rounded-md bg-foreground px-3 py-2 text-xs leading-relaxed text-white shadow-lg">
            {content}
            <T.Arrow className="fill-foreground" />
          </T.Content>
        </T.Portal>
      </T.Root>
    </T.Provider>
  );
}
