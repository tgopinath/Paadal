"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { cn } from "@/lib/utils";
import { MOBILE_TABS, NAV_SECTIONS, isActive } from "./nav";

const PROFILE_SECTIONS = NAV_SECTIONS.flatMap((s) => s.items).filter((i) => !MOBILE_TABS.some((t) => t.href === i.href));

export function MobileNav() {
  // The static shell renders without an active item; the path-aware version streams in.
  return (
    <Suspense fallback={<MobileNavView pathname="" />}>
      <MobileNavActive />
    </Suspense>
  );
}

function MobileNavActive() {
  return <MobileNavView pathname={usePathname()} />;
}

function MobileNavView({ pathname }: { pathname: string }) {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <ul className="grid grid-cols-5">
        {MOBILE_TABS.map((tab) => {
          // Sections reached from Profile keep the Profile tab highlighted.
          const active =
            isActive(pathname, tab.href) || (tab.href === "/profile" && PROFILE_SECTIONS.some((s) => isActive(pathname, s.href)));
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn("flex h-14 flex-col items-center justify-center gap-1 text-[11px] text-muted-foreground", active && "font-medium text-primary")}
              >
                <tab.icon className="size-5" aria-hidden />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
