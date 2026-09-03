import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { MovingTruckClassForm } from "@/components/moving/moving-truck-class-form";

export const metadata: Metadata = { title: "Tipe Truk Baru — Mandana Admin" };

export default async function NewMovingTruckClassPage() {
  await getCurrentUser();

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/moving/truck-classes"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="size-4" />
        Kembali ke daftar tipe truk
      </Link>

      <h2 className="text-lg font-semibold text-primary">Tipe truk baru</h2>

      <MovingTruckClassForm mode="create" />
    </div>
  );
}
