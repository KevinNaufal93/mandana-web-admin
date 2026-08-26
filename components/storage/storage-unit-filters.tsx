"use client";

import { usePathname, useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STORAGE_UNIT_STATUSES, toUnitSearchString, type StorageUnitQuery } from "@/lib/storage/query";
import type { AdminStorageFacility, AdminStorageUnitType } from "@/lib/api/storage";

const STATUS_LABEL: Record<string, string> = {
  available: "Tersedia",
  occupied: "Terisi",
  maintenance: "Perawatan",
};

/** Radix Select reserves "" for "no value" (shows the placeholder). */
const ALL = "all";

export function StorageUnitFilters({
  query,
  facilities,
  unitTypes,
}: {
  query: StorageUnitQuery;
  facilities: AdminStorageFacility[];
  unitTypes: AdminStorageUnitType[];
}) {
  const router = useRouter();
  const pathname = usePathname();

  function navigate(patch: Partial<StorageUnitQuery>) {
    router.replace(`${pathname}${toUnitSearchString(query, { page: 1, ...patch })}`, { scroll: false });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        value={query.facilityId ?? ALL}
        onValueChange={(v) => navigate({ facilityId: v === ALL ? undefined : v })}
      >
        <SelectTrigger className="w-48" aria-label="Filter fasilitas">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Semua fasilitas</SelectItem>
          {facilities.map((f) => (
            <SelectItem key={f.id} value={f.id}>
              {f.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={query.unitTypeId ?? ALL}
        onValueChange={(v) => navigate({ unitTypeId: v === ALL ? undefined : v })}
      >
        <SelectTrigger className="w-44" aria-label="Filter tipe unit">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Semua tipe unit</SelectItem>
          {unitTypes.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={query.status ?? ALL}
        onValueChange={(v) => navigate({ status: v === ALL ? undefined : (v as StorageUnitQuery["status"]) })}
      >
        <SelectTrigger className="w-36" aria-label="Filter status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Semua status</SelectItem>
          {STORAGE_UNIT_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {STATUS_LABEL[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
