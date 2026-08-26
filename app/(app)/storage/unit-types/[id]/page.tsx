import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { getStorageUnitType, type AdminStorageUnitType } from "@/lib/api/storage";
import { StorageUnitTypeDetailView } from "@/components/storage/storage-unit-type-detail-view";
import type { ApiError } from "@/lib/api/errors";

type Params = { id: string };

async function loadUnitType(id: string): Promise<AdminStorageUnitType> {
  const result = await getStorageUnitType(id);
  if (result.ok) return result.data;
  if (result.error.kind === "notFound" || result.error.kind === "validation") notFound();
  throw new Error(errorMessage(result.error));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { id } = await params;
  const result = await getStorageUnitType(id);
  return { title: result.ok ? `${result.data.name} — Mandana Admin` : "Tipe Unit — Mandana Admin" };
}

export default async function StorageUnitTypeDetailPage({ params }: { params: Promise<Params> }) {
  await getCurrentUser();
  const { id } = await params;
  const unitType = await loadUnitType(id);

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/storage/unit-types"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="size-4" />
        Kembali ke daftar tipe unit
      </Link>

      <StorageUnitTypeDetailView unitType={unitType} />
    </div>
  );
}

function errorMessage(error: ApiError): string {
  if (error.kind === "network") return "Tidak dapat terhubung ke server.";
  if (error.messages.length > 0) return error.messages.join(" ");
  return "Gagal memuat detail tipe unit.";
}
