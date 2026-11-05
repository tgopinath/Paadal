"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { NAV_SECTIONS, isActive } from "./nav";

export function Sidebar() {
  // The static shell renders without an active item; the path-aware version streams in.
  return (
    <Suspense fallback={<SidebarView pathname="" />}>
      <SidebarActive />
    </Suspense>
  );
}

function SidebarActive() {
  return <SidebarView pathname={usePathname()} />;
}

function SidebarView({ pathname }: { pathname: string }) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r bg-surface/50 lg:flex">
      <Link href="/" className="px-5 pb-4 pt-5" aria-label="Amazon Pulse home">
        <Logo />
      </Link>
      <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 pb-6">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mt-4 first:mt-1">
            <p className="px-3 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-subtle-foreground">{section.label}</p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex h-9 items-center gap-3 rounded-md px-3 text-sm text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground",
                        active && "bg-white font-medium text-foreground shadow-[0_0_0_1px_var(--border)]",
                      )}
                    >
                      <item.icon className={cn("size-4", active && "text-primary")} aria-hidden />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
