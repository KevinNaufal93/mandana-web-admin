import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Layers } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { listStorageUnits } from "@/lib/api/storage-units";
import { listStorageFacilities, listStorageUnitTypes } from "@/lib/api/storage";
import { parseStorageUnitQuery } from "@/lib/storage/query";
import { StorageUnitFilters } from "@/components/storage/storage-unit-filters";
import { StorageUnitsTable } from "@/components/storage/storage-units-table";
import { StorageUnitsPagination } from "@/components/storage/storage-units-pagination";
import { Button } from "@/components/ui/button";
import type { ApiError } from "@/lib/api/errors";

export const metadata: Metadata = { title: "Unit Smart Storage — Mandana Admin" };

export default async function StorageUnitsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await getCurrentUser();
  const query = parseStorageUnitQuery(await searchParams);

  const [unitsResult, facilitiesResult, unitTypesResult] = await Promise.all([
    listStorageUnits(query),
    listStorageFacilities(),
    listStorageUnitTypes(),
  ]);

  const facilities = facilitiesResult.ok ? facilitiesResult.data : [];
  const unitTypes = unitTypesResult.ok ? unitTypesResult.data : [];
  const hasActiveFilters = Boolean(query.facilityId || query.unitTypeId || query.status);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <StorageUnitFilters query={query} facilities={facilities} unitTypes={unitTypes} />
        <div className="flex items-center gap-2">
          <Button variant="outlineSecondary" asChild>
            <Link href="/storage/units/bulk">
              <Layers className="size-4" />
              Tambah massal
            </Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/storage/units/new">
              <Plus className="size-4" />
              Tambah unit
            </Link>
          </Button>
        </div>
      </div>

      {!unitsResult.ok ? (
        <ErrorPanel message={errorMessage(unitsResult.error)} />
      ) : (
        <>
          <StorageUnitsTable
            rows={unitsResult.data.items}
            facilities={facilities}
            unitTypes={unitTypes}
            hasActiveFilters={hasActiveFilters}
          />
          <StorageUnitsPagination query={query} meta={unitsResult.data.meta} basePath="/storage/units" />
        </>
      )}
    </div>
  );
}

function errorMessage(error: ApiError): string {
  if (error.kind === "network") return "Tidak dapat terhubung ke server.";
  if (error.messages.length > 0) return error.messages.join(" ");
  return "Gagal memuat daftar unit.";
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
      {message}
    </div>
  );
}
