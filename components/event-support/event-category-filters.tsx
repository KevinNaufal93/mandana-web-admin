"use client";

import { usePathname, useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toCategorySearchString, type EventCategoryQuery } from "@/lib/event-support/query";

/** Radix Select reserves "" for "no value" (shows the placeholder). */
const ALL = "all";

export function EventCategoryFilters({ query }: { query: EventCategoryQuery }) {
  const router = useRouter();
  const pathname = usePathname();

  function navigate(isActive: boolean | undefined) {
    router.replace(`${pathname}${toCategorySearchString({ isActive })}`, { scroll: false });
  }

  const value = query.isActive === undefined ? ALL : String(query.isActive);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={value} onValueChange={(v) => navigate(v === ALL ? undefined : v === "true")}>
        <SelectTrigger className="w-40" aria-label="Filter status kategori">
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
