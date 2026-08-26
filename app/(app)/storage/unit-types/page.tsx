import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { listStorageUnitTypes } from "@/lib/api/storage";
import { parseStorageCatalogQuery } from "@/lib/storage/query";
import { StorageCatalogFilters } from "@/components/storage/storage-catalog-filters";
import { StorageUnitTypesTable } from "@/components/storage/storage-unit-types-table";
import { Button } from "@/components/ui/button";
import type { ApiError } from "@/lib/api/errors";

export const metadata: Metadata = { title: "Tipe Unit Smart Storage — Mandana Admin" };

export default async function StorageUnitTypesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await getCurrentUser();
  const query = parseStorageCatalogQuery(await searchParams);
  const result = await listStorageUnitTypes(query);
  const hasActiveFilters = query.isActive !== undefined;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <StorageCatalogFilters query={query} />
        <Button variant="secondary" asChild>
          <Link href="/storage/unit-types/new">
            <Plus className="size-4" />
            Tambah tipe unit
          </Link>
        </Button>
      </div>

      {!result.ok ? (
        <ErrorPanel message={errorMessage(result.error)} />
      ) : (
        <StorageUnitTypesTable rows={result.data} hasActiveFilters={hasActiveFilters} />
      )}
    </div>
  );
}

function errorMessage(error: ApiError): string {
  if (error.kind === "network") return "Tidak dapat terhubung ke server.";
  if (error.messages.length > 0) return error.messages.join(" ");
  return "Gagal memuat daftar tipe unit.";
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
      {message}
    </div>
  );
}
