"use client";

import { usePathname, useRouter } from "next/navigation";
import { BookingFilters } from "@/components/bookings/booking-filters";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STATUS_LABEL } from "@/components/storage/storage-booking-status-badge";
import { STORAGE_BOOKING_STATUSES, toStorageBookingSearchString, type StorageBookingQuery } from "@/lib/storage/query";
import type { AdminStorageFacility, AdminStorageUnitType } from "@/lib/api/storage";

/** Radix Select reserves "" for "no value" (shows the placeholder). */
const ALL = "all";

/**
 * Thin per-module wrapper around the shared BookingFilters — see that
 * file for the search/status/date-range mechanics this reuses. Facility
 * and unit-type are Storage-only, so they're passed through as children
 * rather than baked into the shared component; both are by SLUG, not id
 * (the bookings query DTO takes facilitySlug/unitTypeSlug — see
 * lib/storage/query.ts).
 */
export function StorageBookingFilters({
  query,
  facilities,
  unitTypes,
}: {
  query: StorageBookingQuery;
  facilities: AdminStorageFacility[];
  unitTypes: AdminStorageUnitType[];
}) {
  const router = useRouter();
  const pathname = usePathname();

  function navigate(patch: Partial<StorageBookingQuery>) {
    router.replace(`${pathname}${toStorageBookingSearchString(query, { page: 1, ...patch })}`, { scroll: false });
  }

  return (
    <BookingFilters<StorageBookingQuery>
      query={query}
      statuses={STORAGE_BOOKING_STATUSES}
      statusLabels={STATUS_LABEL}
      toSearchString={toStorageBookingSearchString}
    >
      <Select
        value={query.facilitySlug ?? ALL}
        onValueChange={(v) => navigate({ facilitySlug: v === ALL ? undefined : v })}
      >
        <SelectTrigger className="w-48" aria-label="Filter fasilitas">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Semua fasilitas</SelectItem>
          {facilities.map((f) => (
            <SelectItem key={f.id} value={f.slug}>
              {f.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={query.unitTypeSlug ?? ALL}
        onValueChange={(v) => navigate({ unitTypeSlug: v === ALL ? undefined : v })}
      >
        <SelectTrigger className="w-44" aria-label="Filter tipe unit">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Semua tipe unit</SelectItem>
          {unitTypes.map((t) => (
            <SelectItem key={t.id} value={t.slug}>
              {t.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </BookingFilters>
  );
}
