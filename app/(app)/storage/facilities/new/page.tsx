import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { StorageFacilityForm } from "@/components/storage/storage-facility-form";

export const metadata: Metadata = { title: "Fasilitas Baru — Mandana Admin" };

export default async function NewStorageFacilityPage() {
  await getCurrentUser();

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/storage/facilities"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="size-4" />
        Kembali ke daftar fasilitas
      </Link>

      <h2 className="text-lg font-semibold text-primary">Fasilitas baru</h2>

      <StorageFacilityForm mode="create" />
    </div>
  );
}
