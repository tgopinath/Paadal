export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span aria-hidden className="grid size-8 place-items-center rounded-lg bg-primary text-white">
        <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12h4l2.5-6 4 12 2.5-6H21" />
        </svg>
      </span>
      {!compact && (
        <span className="leading-tight">
          <span className="block text-[15px] font-semibold tracking-tight">Amazon Pulse</span>
          <span className="block text-[11px] text-muted-foreground">Product intelligence · India</span>
        </span>
      )}
    </span>
  );
}
