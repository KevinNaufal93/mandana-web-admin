import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { listEventCategories } from "@/lib/api/event-support";
import { parseEventCategoryQuery } from "@/lib/event-support/query";
import { EventCategoryFilters } from "@/components/event-support/event-category-filters";
import { EventCategoriesTable } from "@/components/event-support/event-categories-table";
import { Button } from "@/components/ui/button";
import type { ApiError } from "@/lib/api/errors";

export const metadata: Metadata = { title: "Kategori Event Support — Mandana Admin" };

export default async function EventCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await getCurrentUser();
  const query = parseEventCategoryQuery(await searchParams);
  const result = await listEventCategories(query);
  const hasActiveFilters = query.isActive !== undefined;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <EventCategoryFilters query={query} />
        <Button variant="secondary" asChild>
          <Link href="/event-support/categories/new">
            <Plus className="size-4" />
            Tambah kategori
          </Link>
        </Button>
      </div>

      {!result.ok ? (
        <ErrorPanel message={errorMessage(result.error)} />
      ) : (
        <EventCategoriesTable rows={result.data} hasActiveFilters={hasActiveFilters} />
      )}
    </div>
  );
}

function errorMessage(error: ApiError): string {
  if (error.kind === "network") return "Tidak dapat terhubung ke server.";
  if (error.messages.length > 0) return error.messages.join(" ");
  return "Gagal memuat daftar kategori.";
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
      {message}
    </div>
  );
}
