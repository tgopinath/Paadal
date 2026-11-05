import { CATEGORY_COLORS } from "@/lib/categories";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Product image. Demo products have no real image, so a neutral category
 * tile is shown instead of a stock photo that could be mistaken for the
 * real item.
 */
export function ProductThumb({ product, size = 44, className }: { product: Product; size?: number; className?: string }) {
  const color = CATEGORY_COLORS[product.categoryId] ?? "#8b8a85";
  if (product.imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={product.imageUrl} alt="" width={size} height={size} className={cn("shrink-0 rounded-md border bg-white object-contain", className)} />;
  }
  const initials = product.subcategory
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, background: `color-mix(in srgb, ${color} 12%, white)`, color }}
      className={cn("grid shrink-0 place-items-center rounded-md border text-[11px] font-semibold", className)}
    >
      {initials}
    </span>
  );
}
