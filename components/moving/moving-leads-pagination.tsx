import Link from "next/link";
import { cn } from "@/lib/utils";
import { toMovingLeadSearchString, type MovingLeadQuery } from "@/lib/moving/query";
import type { PageMeta } from "@/lib/api/server-client";

type PageItem = number | "ellipsis";

/** Copy of components/storage/storage-bookings-pagination.tsx, retyped to
 *  MovingLeadQuery. */
function buildPageList(current: number, total: number): PageItem[] {
  const keep = new Set<number>([1, 2, total - 1, total, current - 1, current, current + 1]);
  const sorted = [...keep].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);

  const items: PageItem[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) items.push("ellipsis");
    items.push(p);
    prev = p;
  }
  return items;
}

const pageLinkClass = (active: boolean) =>
  cn(
    "flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 text-sm font-medium transition-colors",
    active ? "border-primary bg-primary text-card" : "border-border text-primary hover:bg-muted",
  );

export function MovingLeadsPagination({
  query,
  meta,
  basePath,
}: {
  query: MovingLeadQuery;
  meta: PageMeta;
  basePath: string;
}) {
  if (meta.total === 0) return null;

  const from = (meta.page - 1) * meta.limit + 1;
  const to = Math.min(meta.page * meta.limit, meta.total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
      <p className="text-sm text-muted-foreground">
        Menampilkan {from}–{to} dari {meta.total} lead
      </p>

      {meta.totalPages > 1 && (
        <nav aria-label="Navigasi halaman" className="flex items-center gap-1.5">
          {buildPageList(meta.page, meta.totalPages).map((item, i) =>
            item === "ellipsis" ? (
              <span key={`ellipsis-${i}`} className="px-1 text-sm text-muted-foreground">
                …
              </span>
            ) : (
              <Link
                key={item}
                href={`${basePath}${toMovingLeadSearchString(query, { page: item })}`}
                aria-current={item === meta.page ? "page" : undefined}
                className={pageLinkClass(item === meta.page)}
              >
                {item}
              </Link>
            ),
          )}
        </nav>
      )}
    </div>
  );
}
