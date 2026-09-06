import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { BookingListQuery, SortOrder } from "@/lib/bookings/query";

export interface SortableHeadProps<Q extends BookingListQuery & { sortBy: string }> {
  query: Q;
  /** Prefixed onto the link — toSearchString() only returns the "?..." suffix. */
  basePath: string;
  toSearchString: (query: Q, patch: Partial<Q>) => string;
  /** This column's sortBy value. */
  sortKey: Q["sortBy"];
  /** Order applied on the first click into this column (a fresh column
   *  always starts from its own default, never from whatever order the
   *  previously-active column was left on). */
  defaultOrder?: SortOrder;
  className?: string;
  children: ReactNode;
}

/**
 * A sortable `<TableHead>` — clicking it toggles `sortOrder` when it's
 * already the active column, or switches `sortBy` to this column (at
 * `defaultOrder`) otherwise, always resetting to page 1. Rendered as a
 * plain `next/link` (same mechanism components/*-pagination.tsx already
 * uses for page links) so the booking tables stay server components with
 * no client-side state.
 */
export function SortableHead<Q extends BookingListQuery & { sortBy: string }>({
  query,
  basePath,
  toSearchString,
  sortKey,
  defaultOrder = "desc",
  className,
  children,
}: SortableHeadProps<Q>) {
  const active = query.sortBy === sortKey;
  const nextOrder: SortOrder = active ? (query.sortOrder === "asc" ? "desc" : "asc") : defaultOrder;
  const patch = { sortBy: sortKey, sortOrder: nextOrder, page: 1 } as Partial<Q>;
  const href = `${basePath}${toSearchString(query, patch)}`;

  return (
    <TableHead className={className} aria-sort={active ? (query.sortOrder === "asc" ? "ascending" : "descending") : "none"}>
      <Link href={href} scroll={false} className="inline-flex items-center gap-1 hover:text-primary">
        {children}
        <ChevronDown
          className={cn(
            "size-3.5 transition-transform",
            !active && "opacity-0",
            active && query.sortOrder === "asc" && "rotate-180",
          )}
        />
      </Link>
    </TableHead>
  );
}
