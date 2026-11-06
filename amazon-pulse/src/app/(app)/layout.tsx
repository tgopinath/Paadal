import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/shell/sidebar";
import { MobileNav } from "@/components/shell/mobile-nav";
import { Topbar } from "@/components/shell/topbar";
import { DemoBanner } from "@/components/shell/demo-banner";
import { authRequired, getCurrentUser } from "@/lib/auth/session";

/** Server-side session check. The proxy's cookie check is only optimistic. */
async function AuthGate() {
  if (!authRequired()) return null;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return null;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a href="#main" className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-white focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
        Skip to content
      </a>
      <Suspense fallback={null}>
        <AuthGate />
      </Suspense>
      <div className="flex min-h-dvh">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <DemoBanner />
          <main id="main" className="mx-auto w-full max-w-[1440px] flex-1 px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-12 lg:pt-8">
            {children}
          </main>
        </div>
      </div>
      <MobileNav />
    </>
  );
}
