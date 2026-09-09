import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { requireModule } from "@/lib/auth/dal";
import { listEventItems, listEventCategories } from "@/lib/api/event-support";
import { parseEventItemQuery, toItemSearchString } from "@/lib/event-support/query";
import { EventItemFilters } from "@/components/event-support/event-item-filters";
import { EventItemsTable } from "@/components/event-support/event-items-table";
import { Pagination } from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import type { ApiError } from "@/lib/api/errors";

export const metadata: Metadata = { title: "Item Mandana Living — Mandana Admin" };

export default async function EventItemsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireModule("event-support");
  const query = parseEventItemQuery(await searchParams);

  // Fired in parallel: the filter dropdown's categories don't depend on
  // the list result, and vice versa.
  const [itemsResult, categoriesResult] = await Promise.all([listEventItems(query), listEventCategories()]);

  const categories = categoriesResult.ok ? categoriesResult.data : [];
  const hasActiveFilters = Boolean(query.categoryId || query.kind || query.status || query.search);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <EventItemFilters query={query} categories={categories} />
        <Button variant="secondary" asChild>
          <Link href="/event-support/items/new">
            <Plus className="size-4" />
            Tambah item
          </Link>
        </Button>
      </div>

      {!itemsResult.ok ? (
        <ErrorPanel message={errorMessage(itemsResult.error)} />
      ) : (
        <>
          <EventItemsTable rows={itemsResult.data.items} hasActiveFilters={hasActiveFilters} />
          <Pagination meta={itemsResult.data.meta} noun="item" hrefForPage={(page) => `/event-support/items${toItemSearchString(query, { page })}`} />
        </>
      )}
    </div>
  );
}

function errorMessage(error: ApiError): string {
  if (error.kind === "network") return "Tidak dapat terhubung ke server.";
  if (error.messages.length > 0) return error.messages.join(" ");
  return "Gagal memuat daftar item.";
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
      {message}
    </div>
  );
}
