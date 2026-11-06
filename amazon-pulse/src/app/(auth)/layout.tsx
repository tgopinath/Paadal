import { Logo } from "@/components/shell/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-surface px-4 py-10">
      <div className="mb-8">
        <Logo />
      </div>
      <div className="w-full max-w-sm rounded-xl border bg-white p-6 shadow-sm sm:p-8">{children}</div>
      <p className="mt-6 max-w-sm text-center text-xs text-muted-foreground">Discover demand. Understand trends. Find opportunities.</p>
    </div>
  );
}
