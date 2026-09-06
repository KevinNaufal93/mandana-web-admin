"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { BookingListQuery } from "@/lib/bookings/query";

const SEARCH_DEBOUNCE_MS = 350;

/** Radix Select reserves "" for "no value" (shows the placeholder). */
const ALL = "all";

export interface BookingFiltersProps<Q extends BookingListQuery & { status?: string }> {
  query: Q;
  /** The module's status enum values, in display order. */
  statuses: readonly NonNullable<Q["status"]>[];
  /** Indonesian label per status — pass the badge component's exported `STATUS_LABEL`. */
  statusLabels: Record<NonNullable<Q["status"]>, string>;
  /** The module's own `toXBookingSearchString` — kept as a prop (not imported here)
   *  so this stays a generic client component with no per-module coupling. */
  toSearchString: (query: Q, patch: Partial<Q>) => string;
  searchPlaceholder?: string;
  dateFromLabel?: string;
  dateToLabel?: string;
  /** Extra module-only controls (e.g. Storage's facility/unit-type selects),
   *  rendered between the status and date-range filters. */
  children?: ReactNode;
}

/**
 * Shared filter bar for every admin "pemesanan" list (Storage, Moving,
 * Event Support) — carries the four conventions every per-module filter
 * bar in this codebase used to duplicate: the `ALL` Select sentinel, a
 * `navigate()` that always resets to page 1, the 350ms search debounce,
 * and the render-time search resync (adjusting state during render per
 * https://react.dev/learn/you-might-not-need-an-effect, so pagination and
 * browser back/forward stay in sync without an extra effect-driven
 * render).
 *
 * `status` stays generic per module — each is its own Postgres enum, same
 * reason lib/bookings/query.ts's `BookingListQuery` leaves it off the
 * shared type. Callers pass their own `statuses`/`statusLabels`/
 * `toSearchString`; see components/storage/storage-booking-filters.tsx for
 * the thin per-module wrapper this is meant to be used through.
 */
export function BookingFilters<Q extends BookingListQuery & { status?: string }>({
  query,
  statuses,
  statusLabels,
  toSearchString,
  searchPlaceholder = "Cari referensi, nama, telepon, atau email…",
  dateFromLabel = "Dari tanggal",
  dateToLabel = "Sampai tanggal",
  children,
}: BookingFiltersProps<Q>) {
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState(query.search ?? "");

  // Adjusting state during render (React's documented pattern for "reset
  // state when a prop changes") instead of an effect: keeps the input in
  // sync when navigation happens some other way — pagination, browser
  // back/forward — without the extra render an effect-based sync would
  // cost.
  const [syncedSearch, setSyncedSearch] = useState(query.search);
  if (query.search !== syncedSearch) {
    setSyncedSearch(query.search);
    setSearch(query.search ?? "");
  }

  function navigate(patch: Partial<Q>) {
    const merged = { page: 1, ...patch } as Partial<Q>;
    router.replace(`${pathname}${toSearchString(query, merged)}`, { scroll: false });
  }

  // Debounce the search box only; every other filter navigates immediately.
  useEffect(() => {
    const current = query.search ?? "";
    if (search === current) return;
    const id = setTimeout(() => navigate({ search: (search || undefined) as Q["search"] } as Partial<Q>), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={searchPlaceholder}
        className="w-full sm:w-64"
        aria-label="Cari pemesanan"
      />

      <Select
        value={query.status ?? ALL}
        onValueChange={(v) => navigate({ status: (v === ALL ? undefined : v) as Q["status"] } as Partial<Q>)}
      >
        <SelectTrigger className="w-40" aria-label="Filter status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Semua status</SelectItem>
          {statuses.map((s) => (
            <SelectItem key={s} value={s}>
              {statusLabels[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {children}

      <div className="flex items-center gap-1.5">
        <Input
          type="date"
          value={query.from ?? ""}
          onChange={(e) => navigate({ from: (e.target.value || undefined) as Q["from"] } as Partial<Q>)}
          aria-label={dateFromLabel}
          className="w-40"
        />
        <span className="text-sm text-muted-foreground">–</span>
        <Input
          type="date"
          value={query.to ?? ""}
          onChange={(e) => navigate({ to: (e.target.value || undefined) as Q["to"] } as Partial<Q>)}
          aria-label={dateToLabel}
          className="w-40"
        />
      </div>
    </div>
  );
}
