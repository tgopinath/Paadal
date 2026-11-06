import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Card } from "@/components/ui/card";
import { MOBILE_TABS, NAV_SECTIONS } from "@/components/shell/nav";

export const metadata: Metadata = { title: "Profile" };

/** Mobile hub for the sections that don't fit in the bottom bar. */
export default function ProfilePage() {
  return (
    <>
      <PageHeader title="Profile" description="All sections and settings." />
      <div className="space-y-6">
        {NAV_SECTIONS.map((s) => {
          const items = s.items.filter((i) => !MOBILE_TABS.some((t) => t.href === i.href));
          if (!items.length) return null;
          return (
            <section key={s.label}>
              <h2 className="mb-2 px-1 text-[11px] font-medium uppercase tracking-wider text-subtle-foreground">{s.label}</h2>
              <Card className="divide-y overflow-hidden">
                {items.map((i) => (
                  <Link key={i.href} href={i.href} className="flex h-14 items-center gap-3 px-4 text-sm hover:bg-surface">
                    <i.icon className="size-5 text-muted-foreground" aria-hidden />
                    <span className="flex-1">{i.label}</span>
                    <ChevronRight className="size-4 text-subtle-foreground" aria-hidden />
                  </Link>
                ))}
              </Card>
            </section>
          );
        })}
      </div>
    </>
  );
}
