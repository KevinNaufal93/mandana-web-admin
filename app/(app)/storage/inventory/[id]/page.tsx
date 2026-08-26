import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { getStorageInventory, type AdminStorageInventory } from "@/lib/api/storage-inventory";
import { listStorageFacilities, listStorageUnitTypes } from "@/lib/api/storage";
import { StorageInventoryDetailView } from "@/components/storage/storage-inventory-detail-view";
import type { ApiError } from "@/lib/api/errors";

type Params = { id: string };

async function loadInventory(id: string): Promise<AdminStorageInventory> {
  const result = await getStorageInventory(id);
  if (result.ok) return result.data;
  if (result.error.kind === "notFound" || result.error.kind === "validation") notFound();
  throw new Error(errorMessage(result.error));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { id } = await params;
  const result = await getStorageInventory(id);
  return { title: result.ok ? `${result.data.facilitySlug} · ${result.data.unitTypeSlug} — Mandana Admin` : "Inventaris — Mandana Admin" };
}

export default async function StorageInventoryDetailPage({ params }: { params: Promise<Params> }) {
  await getCurrentUser();
  const { id } = await params;

  // The inventory row is the page — a failure there 404s/throws. The
  // catalogs are supporting data for the name lookup + edit form's
  // selects; if either fails to load, the page still renders (falling
  // back to slugs, same pattern as EventItemDetailPage's categories).
  const [inventory, facilitiesResult, unitTypesResult] = await Promise.all([
    loadInventory(id),
    listStorageFacilities(),
    listStorageUnitTypes(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/storage/inventory"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="size-4" />
        Kembali ke daftar inventaris
      </Link>

      <StorageInventoryDetailView
        inventory={inventory}
        facilities={facilitiesResult.ok ? facilitiesResult.data : []}
        unitTypes={unitTypesResult.ok ? unitTypesResult.data : []}
      />
    </div>
  );
}

function errorMessage(error: ApiError): string {
  if (error.kind === "network") return "Tidak dapat terhubung ke server.";
  if (error.messages.length > 0) return error.messages.join(" ");
  return "Gagal memuat detail inventaris.";
}
