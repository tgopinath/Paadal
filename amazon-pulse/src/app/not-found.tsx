import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/states";

export default function NotFound() {
  return (
    <EmptyState
      title="Page or product not found"
      description="The ASIN may not be tracked yet, or the link is out of date."
      action={
        <Button asChild variant="outline">
          <Link href="/products">Browse products</Link>
        </Button>
      }
    />
  );
}
