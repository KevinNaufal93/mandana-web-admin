"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MOVING_LEAD_STATUSES, toMovingLeadSearchString, type MovingLeadQuery } from "@/lib/moving/query";

const STATUS_LABEL: Record<string, string> = {
  new: "Baru",
  contacted: "Dihubungi",
  converted: "Dikonversi",
  lost: "Hilang",
};

const SEARCH_DEBOUNCE_MS = 350;

/** Radix Select reserves "" for "no value" (shows the placeholder). */
const ALL = "all";

/** Copy of components/event-support/booking-filters.tsx's shape — closest
 *  existing match (search + status + from/to date range). `search` here
 *  matches reference/customerName/phone, but today only `reference` is
 *  ever populated — the public capture form collects no contact fields. */
export function MovingLeadFilters({ query }: { query: MovingLeadQuery }) {
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState(query.search ?? "");

  const [syncedSearch, setSyncedSearch] = useState(query.search);
  if (query.search !== syncedSearch) {
    setSyncedSearch(query.search);
    setSearch(query.search ?? "");
  }

  function navigate(patch: Partial<MovingLeadQuery>) {
    router.replace(`${pathname}${toMovingLeadSearchString(query, { page: 1, ...patch })}`, { scroll: false });
  }

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
        placeholder="Cari referensi, nama, atau telepon…"
        className="w-full sm:w-64"
        aria-label="Cari lead"
      />

      <Select
        value={query.status ?? ALL}
        onValueChange={(v) => navigate({ status: v === ALL ? undefined : (v as MovingLeadQuery["status"]) })}
      >
        <SelectTrigger className="w-40" aria-label="Filter status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Semua status</SelectItem>
          {MOVING_LEAD_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {STATUS_LABEL[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-1.5">
        <Input
          type="date"
          value={query.from ?? ""}
          onChange={(e) => navigate({ from: e.target.value || undefined })}
          aria-label="Dari tanggal"
          className="w-40"
        />
        <span className="text-sm text-muted-foreground">–</span>
        <Input
          type="date"
          value={query.to ?? ""}
          onChange={(e) => navigate({ to: e.target.value || undefined })}
          aria-label="Sampai tanggal"
          className="w-40"
        />
      </div>
    </div>
  );
}
