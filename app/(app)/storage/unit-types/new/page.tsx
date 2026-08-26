import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { StorageUnitTypeForm } from "@/components/storage/storage-unit-type-form";

export const metadata: Metadata = { title: "Tipe Unit Baru — Mandana Admin" };

export default async function NewStorageUnitTypePage() {
  await getCurrentUser();

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/storage/unit-types"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="size-4" />
        Kembali ke daftar tipe unit
      </Link>

      <h2 className="text-lg font-semibold text-primary">Tipe unit baru</h2>

      <StorageUnitTypeForm mode="create" />
    </div>
  );
}
