import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
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
 *
 * Visually distinct from a plain `TableHead` by design — bold label plus
 * an always-visible chevron (muted "unfold" glyph when this column isn't
 * the active sort, a solid directional one in primary when it is), so a
 * sortable column reads as sortable before anyone hovers it. A plain
 * (non-sortable) `TableHead` keeps its ordinary muted, medium-weight
 * label with no icon — the contrast between the two is the point.
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
  const order = query.sortOrder;
  const nextOrder: SortOrder = active ? (order === "asc" ? "desc" : "asc") : defaultOrder;
  const patch = { sortBy: sortKey, sortOrder: nextOrder, page: 1 } as Partial<Q>;
  const href = `${basePath}${toSearchString(query, patch)}`;
  const Icon = active ? (order === "asc" ? ChevronUp : ChevronDown) : ChevronsUpDown;

  return (
    <TableHead className={className} aria-sort={active ? (order === "asc" ? "ascending" : "descending") : "none"}>
      <Link
        href={href}
        scroll={false}
        className={cn(
          "inline-flex items-center gap-1 font-semibold transition-colors hover:text-primary",
          active ? "text-primary" : "text-muted-foreground",
        )}
      >
        {children}
        <Icon className={cn("size-3.5 shrink-0", !active && "text-muted-foreground/50")} />
      </Link>
    </TableHead>
  );
}
