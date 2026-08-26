import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { listStorageFacilities, listStorageUnitTypes } from "@/lib/api/storage";
import { StorageUnitForm } from "@/components/storage/storage-unit-form";

export const metadata: Metadata = { title: "Unit Baru — Mandana Admin" };

export default async function NewStorageUnitPage() {
  await getCurrentUser();
  const [facilitiesResult, unitTypesResult] = await Promise.all([listStorageFacilities(), listStorageUnitTypes()]);
  const facilities = facilitiesResult.ok ? facilitiesResult.data : [];
  const unitTypes = unitTypesResult.ok ? unitTypesResult.data : [];

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/storage/units"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="size-4" />
        Kembali ke daftar unit
      </Link>

      <h2 className="text-lg font-semibold text-primary">Unit baru</h2>

      {facilities.length === 0 || unitTypes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Butuh minimal satu fasilitas dan satu tipe unit sebelum unit dapat dibuat.{" "}
          {facilities.length === 0 && (
            <>
              <Link href="/storage/facilities/new" className="text-primary underline">
                Buat fasilitas
              </Link>
              .{" "}
            </>
          )}
          {unitTypes.length === 0 && (
            <>
              <Link href="/storage/unit-types/new" className="text-primary underline">
                Buat tipe unit
              </Link>
              .
            </>
          )}
        </p>
      ) : (
        <StorageUnitForm mode="create" facilities={facilities} unitTypes={unitTypes} />
      )}
    </div>
  );
}
