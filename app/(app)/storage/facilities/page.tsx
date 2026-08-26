import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { listStorageFacilities } from "@/lib/api/storage";
import { parseStorageCatalogQuery } from "@/lib/storage/query";
import { StorageCatalogFilters } from "@/components/storage/storage-catalog-filters";
import { StorageFacilitiesTable } from "@/components/storage/storage-facilities-table";
import { Button } from "@/components/ui/button";
import type { ApiError } from "@/lib/api/errors";

export const metadata: Metadata = { title: "Fasilitas Smart Storage — Mandana Admin" };

export default async function StorageFacilitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await getCurrentUser();
  const query = parseStorageCatalogQuery(await searchParams);
  const result = await listStorageFacilities(query);
  const hasActiveFilters = query.isActive !== undefined;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <StorageCatalogFilters query={query} />
        <Button variant="secondary" asChild>
          <Link href="/storage/facilities/new">
            <Plus className="size-4" />
            Tambah fasilitas
          </Link>
        </Button>
      </div>

      {!result.ok ? (
        <ErrorPanel message={errorMessage(result.error)} />
      ) : (
        <StorageFacilitiesTable rows={result.data} hasActiveFilters={hasActiveFilters} />
      )}
    </div>
  );
}

function errorMessage(error: ApiError): string {
  if (error.kind === "network") return "Tidak dapat terhubung ke server.";
  if (error.messages.length > 0) return error.messages.join(" ");
  return "Gagal memuat daftar fasilitas.";
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
      {message}
    </div>
  );
}
