"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ARTICLE_STATUSES, toArticleSearchString, type ArticleQuery } from "@/lib/articles/query";
import type { AdminArticleCategory } from "@/lib/api/articles";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draf",
  published: "Terbit",
  archived: "Arsip",
};

const SEARCH_DEBOUNCE_MS = 350;

/** Radix Select reserves "" for "no value" (shows the placeholder). */
const ALL = "all";

export function ArticleFilters({ query, categories }: { query: ArticleQuery; categories: AdminArticleCategory[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState(query.search ?? "");

  // Adjusting state during render, same pattern as EventItemFilters — keeps
  // the box in sync on back/forward without an extra effect render.
  const [syncedSearch, setSyncedSearch] = useState(query.search);
  if (query.search !== syncedSearch) {
    setSyncedSearch(query.search);
    setSearch(query.search ?? "");
  }

  function navigate(patch: Partial<ArticleQuery>) {
    router.replace(`${pathname}${toArticleSearchString(query, { page: 1, ...patch })}`, { scroll: false });
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
        placeholder="Cari judul atau ringkasan…"
        className="w-full sm:w-64"
        aria-label="Cari artikel"
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
        value={query.status ?? ALL}
        onValueChange={(v) => navigate({ status: v === ALL ? undefined : (v as ArticleQuery["status"]) })}
      >
        <SelectTrigger className="w-36" aria-label="Filter status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Semua status</SelectItem>
          {ARTICLE_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {STATUS_LABEL[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
