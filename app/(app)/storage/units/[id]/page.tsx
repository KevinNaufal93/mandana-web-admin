import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { getStorageUnit, type AdminStorageUnit } from "@/lib/api/storage-units";
import { listStorageFacilities, listStorageUnitTypes } from "@/lib/api/storage";
import { StorageUnitDetailView } from "@/components/storage/storage-unit-detail-view";
import type { ApiError } from "@/lib/api/errors";

type Params = { id: string };

async function loadUnit(id: string): Promise<AdminStorageUnit> {
  const result = await getStorageUnit(id);
  if (result.ok) return result.data;
  if (result.error.kind === "notFound" || result.error.kind === "validation") notFound();
  throw new Error(errorMessage(result.error));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { id } = await params;
  const result = await getStorageUnit(id);
  return { title: result.ok ? `${result.data.code} — Mandana Admin` : "Unit — Mandana Admin" };
}

export default async function StorageUnitDetailPage({ params }: { params: Promise<Params> }) {
  await getCurrentUser();
  const { id } = await params;

  const [unit, facilitiesResult, unitTypesResult] = await Promise.all([
    loadUnit(id),
    listStorageFacilities(),
    listStorageUnitTypes(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/storage/units"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="size-4" />
        Kembali ke daftar unit
      </Link>

      <StorageUnitDetailView
        unit={unit}
        facilities={facilitiesResult.ok ? facilitiesResult.data : []}
        unitTypes={unitTypesResult.ok ? unitTypesResult.data : []}
      />
    </div>
  );
}

function errorMessage(error: ApiError): string {
  if (error.kind === "network") return "Tidak dapat terhubung ke server.";
  if (error.messages.length > 0) return error.messages.join(" ");
  return "Gagal memuat detail unit.";
}
