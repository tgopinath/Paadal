import Link from "next/link";
import { Suspense } from "react";
import { LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authAvailable, getCurrentUser } from "@/lib/auth/session";
import { signOut } from "@/app/(auth)/actions";

async function UserMenuInner({ compact }: { compact?: boolean }) {
  if (!authAvailable()) return null;
  const user = await getCurrentUser();
  if (!user) {
    return (
      <Button asChild variant="outline" size="sm">
        <Link href="/login">
          <LogIn /> Sign in
        </Link>
      </Button>
    );
  }
  const label = user.name || user.email;
  const initials = label
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
  return (
    <div className="flex items-center gap-2">
      <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
        {initials}
      </span>
      {!compact && <span className="hidden max-w-40 truncate text-[13px] sm:inline">{label}</span>}
      <form action={signOut}>
        <Button type="submit" variant="ghost" size="icon-sm" aria-label="Sign out" title="Sign out">
          <LogOut />
        </Button>
      </form>
    </div>
  );
}

export function UserMenu({ compact }: { compact?: boolean }) {
  return (
    <Suspense fallback={<span className="size-8" />}>
      <UserMenuInner compact={compact} />
    </Suspense>
  );
}
