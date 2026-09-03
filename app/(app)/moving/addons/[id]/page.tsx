import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { getMovingAddon, type AdminMovingAddon } from "@/lib/api/moving";
import { MovingAddonDetailView } from "@/components/moving/moving-addon-detail-view";
import type { ApiError } from "@/lib/api/errors";

type Params = { id: string };

async function loadAddon(id: string): Promise<AdminMovingAddon> {
  const result = await getMovingAddon(id);
  if (result.ok) return result.data;
  if (result.error.kind === "notFound" || result.error.kind === "validation") notFound();
  throw new Error(errorMessage(result.error));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { id } = await params;
  const result = await getMovingAddon(id);
  return { title: result.ok ? `${result.data.name} — Mandana Admin` : "Add-on — Mandana Admin" };
}

export default async function MovingAddonDetailPage({ params }: { params: Promise<Params> }) {
  await getCurrentUser();
  const { id } = await params;
  const addon = await loadAddon(id);

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/moving/addons"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="size-4" />
        Kembali ke daftar add-on
      </Link>

      <MovingAddonDetailView addon={addon} />
    </div>
  );
}

function errorMessage(error: ApiError): string {
  if (error.kind === "network") return "Tidak dapat terhubung ke server.";
  if (error.messages.length > 0) return error.messages.join(" ");
  return "Gagal memuat detail add-on.";
}
