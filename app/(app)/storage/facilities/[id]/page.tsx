import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { getStorageFacility, type AdminStorageFacility } from "@/lib/api/storage";
import { StorageFacilityDetailView } from "@/components/storage/storage-facility-detail-view";
import type { ApiError } from "@/lib/api/errors";

type Params = { id: string };

/** notFound() covers both "doesn't exist" and a malformed id
 *  (ParseUUIDPipe 400s) — either way there's no facility page to render. */
async function loadFacility(id: string): Promise<AdminStorageFacility> {
  const result = await getStorageFacility(id);
  if (result.ok) return result.data;
  if (result.error.kind === "notFound" || result.error.kind === "validation") notFound();
  throw new Error(errorMessage(result.error));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { id } = await params;
  const result = await getStorageFacility(id);
  return { title: result.ok ? `${result.data.name} — Mandana Admin` : "Fasilitas — Mandana Admin" };
}

export default async function StorageFacilityDetailPage({ params }: { params: Promise<Params> }) {
  await getCurrentUser();
  const { id } = await params;
  const facility = await loadFacility(id);

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/storage/facilities"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="size-4" />
        Kembali ke daftar fasilitas
      </Link>

      <StorageFacilityDetailView facility={facility} />
    </div>
  );
}

function errorMessage(error: ApiError): string {
  if (error.kind === "network") return "Tidak dapat terhubung ke server.";
  if (error.messages.length > 0) return error.messages.join(" ");
  return "Gagal memuat detail fasilitas.";
}
