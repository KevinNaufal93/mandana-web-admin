"use client";

import { usePathname, useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toCatalogSearchString, type StorageCatalogQuery } from "@/lib/storage/query";

/** Shared by facilities and unit types — both lists filter on `isActive`
 *  only, same as EventCategoryFilters. Radix Select reserves "" for "no
 *  value" (shows the placeholder). */
const ALL = "all";

export function StorageCatalogFilters({ query }: { query: StorageCatalogQuery }) {
  const router = useRouter();
  const pathname = usePathname();

  function navigate(isActive: boolean | undefined) {
    router.replace(`${pathname}${toCatalogSearchString({ isActive })}`, { scroll: false });
  }

  const value = query.isActive === undefined ? ALL : String(query.isActive);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={value} onValueChange={(v) => navigate(v === ALL ? undefined : v === "true")}>
        <SelectTrigger className="w-40" aria-label="Filter status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Semua status</SelectItem>
          <SelectItem value="true">Aktif</SelectItem>
          <SelectItem value="false">Nonaktif</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
