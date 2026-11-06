import Link from "next/link";
import { Search } from "lucide-react";
import { Logo } from "./logo";
import { UserMenu } from "./user-menu";

/**
 * Global search. A plain GET form, so it works before hydration and on
 * slow connections; the explorer parses `q` (name, ASIN, brand, category,
 * keyword).
 */
export function Topbar() {
  return (
    <header className="sticky top-0 z-30 border-b bg-white/90 backdrop-blur">
      <div className="flex h-14 items-center gap-3 px-4 sm:px-6 lg:h-16 lg:px-8">
        <Link href="/" className="lg:hidden" aria-label="Amazon Pulse home">
          <Logo compact />
        </Link>
        <form action="/products" role="search" className="relative max-w-xl flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle-foreground" aria-hidden />
          <input
            type="search"
            name="q"
            placeholder="Search products, ASIN, brand or category"
            aria-label="Search products"
            className="h-10 w-full rounded-lg border border-input bg-surface pl-9 pr-3 text-sm placeholder:text-subtle-foreground focus:bg-white"
          />
        </form>
        <div className="ml-auto">
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
