"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  PROPERTY_STATUSES,
  LISTING_TYPES,
  toSearchString,
  type PropertyQuery,
} from "@/lib/properties/query";
import type { PropertyTypeOption } from "@/lib/api/properties";
import { LISTING_LABEL } from "@/components/properties/property-status-badge";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draf",
  published: "Terbit",
  archived: "Arsip",
};

const SEARCH_DEBOUNCE_MS = 350;

/** Radix Select reserves the empty string for "no value" (shows the
 *  placeholder), so "clear this filter" needs its own sentinel value. */
const ALL = "all";

/**
 * Fetches nothing itself — server-rendered filter options come in as
 * props. Every change pushes to the URL (always resetting page to 1), so
 * the server component that owns data-fetching re-runs from a fresh
 * searchParams read.
 */
export function PropertyFilters({
  query,
  propertyTypes,
}: {
  query: PropertyQuery;
  propertyTypes: PropertyTypeOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState(query.search ?? "");

  // Adjusting state during render (React's documented pattern for
  // "reset state when a prop changes") instead of an effect: keeps the
  // input in sync when navigation happens some other way — pagination,
  // browser back/forward — without the extra render an effect-based sync
  // would cost. See https://react.dev/learn/you-might-not-need-an-effect.
  const [syncedSearch, setSyncedSearch] = useState(query.search);
  if (query.search !== syncedSearch) {
    setSyncedSearch(query.search);
    setSearch(query.search ?? "");
  }

  function navigate(patch: Partial<PropertyQuery>) {
    router.replace(`${pathname}${toSearchString(query, { page: 1, ...patch })}`, { scroll: false });
  }

  // Debounce the search box only; every other filter navigates immediately.
  useEffect(() => {
    const current = query.search ?? "";
    if (search === current) return;
    const id = setTimeout(() => navigate({ search: search || undefined }), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Cari judul, kota, alamat…"
        className="w-full sm:w-64"
        aria-label="Cari properti"
      />

      <Select
        value={query.status ?? ALL}
        onValueChange={(v) => navigate({ status: v === ALL ? undefined : (v as PropertyQuery["status"]) })}
      >
        <SelectTrigger className="w-40" aria-label="Filter status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Semua status</SelectItem>
          {PROPERTY_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {STATUS_LABEL[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={query.listingType ?? ALL}
        onValueChange={(v) =>
          navigate({ listingType: v === ALL ? undefined : (v as PropertyQuery["listingType"]) })
        }
      >
        <SelectTrigger className="w-40" aria-label="Filter tipe listing">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Semua tipe</SelectItem>
          {LISTING_TYPES.map((t) => (
            <SelectItem key={t} value={t}>
              {LISTING_LABEL[t]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={query.propertyTypeId ?? ALL}
        onValueChange={(v) => navigate({ propertyTypeId: v === ALL ? undefined : v })}
      >
        <SelectTrigger className="w-44" aria-label="Filter kategori properti">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Semua kategori</SelectItem>
          {propertyTypes.map((pt) => (
            <SelectItem key={pt.id} value={pt.id}>
              {pt.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
