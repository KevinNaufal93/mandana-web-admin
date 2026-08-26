"use client";

import { usePathname, useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toInventorySearchString, type StorageInventoryQuery } from "@/lib/storage/query";
import type { AdminStorageFacility, AdminStorageUnitType } from "@/lib/api/storage";

/** Radix Select reserves "" for "no value" (shows the placeholder). */
const ALL = "all";

export function StorageInventoryFilters({
  query,
  facilities,
  unitTypes,
}: {
  query: StorageInventoryQuery;
  facilities: AdminStorageFacility[];
  unitTypes: AdminStorageUnitType[];
}) {
  const router = useRouter();
  const pathname = usePathname();

  function navigate(patch: Partial<StorageInventoryQuery>) {
    router.replace(`${pathname}${toInventorySearchString({ ...query, ...patch })}`, { scroll: false });
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
    </div>
  );
}
