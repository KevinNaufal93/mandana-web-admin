"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EVENT_ITEM_STATUSES, EVENT_ITEM_KINDS, toItemSearchString, type EventItemQuery } from "@/lib/event-support/query";
import type { AdminEventCategory } from "@/lib/api/event-support";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draf",
  published: "Terbit",
  archived: "Arsip",
};

const KIND_LABEL: Record<string, string> = {
  package: "Paket",
  addon: "Add on",
};

const SEARCH_DEBOUNCE_MS = 350;

/** Radix Select reserves "" for "no value" (shows the placeholder). */
const ALL = "all";

export function EventItemFilters({ query, categories }: { query: EventItemQuery; categories: AdminEventCategory[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState(query.search ?? "");

  // Adjusting state during render, same pattern as PropertyFilters — keeps
  // the box in sync on back/forward without an extra effect render.
  const [syncedSearch, setSyncedSearch] = useState(query.search);
  if (query.search !== syncedSearch) {
    setSyncedSearch(query.search);
    setSearch(query.search ?? "");
  }

  function navigate(patch: Partial<EventItemQuery>) {
    router.replace(`${pathname}${toItemSearchString(query, { page: 1, ...patch })}`, { scroll: false });
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
        placeholder="Cari nama item…"
        className="w-full sm:w-64"
        aria-label="Cari item"
      />

      <Select
        value={query.categoryId ?? ALL}
        onValueChange={(v) => navigate({ categoryId: v === ALL ? undefined : v })}
      >
        <SelectTrigger className="w-44" aria-label="Filter kategori">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Semua kategori</SelectItem>
          {categories.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={query.kind ?? ALL}
        onValueChange={(v) => navigate({ kind: v === ALL ? undefined : (v as EventItemQuery["kind"]) })}
      >
        <SelectTrigger className="w-36" aria-label="Filter jenis">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Semua jenis</SelectItem>
          {EVENT_ITEM_KINDS.map((k) => (
            <SelectItem key={k} value={k}>
              {KIND_LABEL[k]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={query.status ?? ALL}
        onValueChange={(v) => navigate({ status: v === ALL ? undefined : (v as EventItemQuery["status"]) })}
      >
        <SelectTrigger className="w-36" aria-label="Filter status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Semua status</SelectItem>
          {EVENT_ITEM_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {STATUS_LABEL[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
