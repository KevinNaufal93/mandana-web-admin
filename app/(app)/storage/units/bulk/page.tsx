import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { listStorageFacilities, listStorageUnitTypes } from "@/lib/api/storage";
import { StorageUnitsBulkForm } from "@/components/storage/storage-units-bulk-form";

export const metadata: Metadata = { title: "Tambah Unit Massal — Mandana Admin" };

export default async function StorageUnitsBulkPage() {
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

      <div>
        <h2 className="text-lg font-semibold text-primary">Tambah unit secara massal</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Menambahkan sejumlah unit sekaligus untuk satu kombinasi fasilitas dan tipe unit — kode dibuat
          otomatis dan melanjutkan urutan yang sudah ada.
        </p>
      </div>

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
        <StorageUnitsBulkForm facilities={facilities} unitTypes={unitTypes} />
      )}
    </div>
  );
}
