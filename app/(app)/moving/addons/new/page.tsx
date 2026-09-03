import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { MovingAddonForm } from "@/components/moving/moving-addon-form";

export const metadata: Metadata = { title: "Add-on Baru — Mandana Admin" };

export default async function NewMovingAddonPage() {
  await getCurrentUser();

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/moving/addons"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="size-4" />
        Kembali ke daftar add-on
      </Link>

      <h2 className="text-lg font-semibold text-primary">Add-on baru</h2>

      <MovingAddonForm mode="create" />
    </div>
  );
}
