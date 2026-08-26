import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { listStorageInventory } from "@/lib/api/storage-inventory";
import { listStorageFacilities, listStorageUnitTypes } from "@/lib/api/storage";
import { parseStorageInventoryQuery } from "@/lib/storage/query";
import { StorageInventoryFilters } from "@/components/storage/storage-inventory-filters";
import { StorageInventoryTable } from "@/components/storage/storage-inventory-table";
import { Button } from "@/components/ui/button";
import type { ApiError } from "@/lib/api/errors";

export const metadata: Metadata = { title: "Inventaris Smart Storage — Mandana Admin" };

export default async function StorageInventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await getCurrentUser();
  const query = parseStorageInventoryQuery(await searchParams);

  const [inventoryResult, facilitiesResult, unitTypesResult] = await Promise.all([
    listStorageInventory(query),
    listStorageFacilities(),
    listStorageUnitTypes(),
  ]);

  const facilities = facilitiesResult.ok ? facilitiesResult.data : [];
  const unitTypes = unitTypesResult.ok ? unitTypesResult.data : [];
  const hasActiveFilters = Boolean(query.facilityId || query.unitTypeId);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <StorageInventoryFilters query={query} facilities={facilities} unitTypes={unitTypes} />
        <Button variant="secondary" asChild>
          <Link href="/storage/inventory/new">
            <Plus className="size-4" />
            Tambah inventaris
          </Link>
        </Button>
      </div>

      {!inventoryResult.ok ? (
        <ErrorPanel message={errorMessage(inventoryResult.error)} />
      ) : (
        <StorageInventoryTable
          rows={inventoryResult.data}
          facilities={facilities}
          unitTypes={unitTypes}
          hasActiveFilters={hasActiveFilters}
        />
      )}
    </div>
  );
}

function errorMessage(error: ApiError): string {
  if (error.kind === "network") return "Tidak dapat terhubung ke server.";
  if (error.messages.length > 0) return error.messages.join(" ");
  return "Gagal memuat daftar inventaris.";
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
      {message}
    </div>
  );
}
