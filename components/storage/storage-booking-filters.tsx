"use client";

import { usePathname, useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STORAGE_BOOKING_STATUSES, toStorageBookingSearchString, type StorageBookingQuery } from "@/lib/storage/query";
import type { AdminStorageFacility, AdminStorageUnitType } from "@/lib/api/storage";

const STATUS_LABEL: Record<string, string> = {
  pending: "Menunggu",
  confirmed: "Terkonfirmasi",
  rejected: "Ditolak",
  cancelled: "Dibatalkan",
  completed: "Selesai",
};

/** Radix Select reserves "" for "no value" (shows the placeholder). */
const ALL = "all";

/** Facility/unit-type filters are by SLUG here, not id — the bookings
 *  query DTO takes facilitySlug/unitTypeSlug (see lib/storage/query.ts).
 *  No search box and no date range: the DTO genuinely has neither,
 *  unlike EventBookingQuery. */
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
    <div className="flex flex-wrap items-center gap-3">
      <Select
        value={query.status ?? ALL}
        onValueChange={(v) => navigate({ status: v === ALL ? undefined : (v as StorageBookingQuery["status"]) })}
      >
        <SelectTrigger className="w-40" aria-label="Filter status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Semua status</SelectItem>
          {STORAGE_BOOKING_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {STATUS_LABEL[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

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
    </div>
  );
}
