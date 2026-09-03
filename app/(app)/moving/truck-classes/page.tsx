import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { listMovingTruckClasses } from "@/lib/api/moving";
import { parseMovingCatalogQuery } from "@/lib/moving/query";
import { MovingCatalogFilters } from "@/components/moving/moving-catalog-filters";
import { MovingTruckClassesTable } from "@/components/moving/moving-truck-classes-table";
import { Button } from "@/components/ui/button";
import type { ApiError } from "@/lib/api/errors";

export const metadata: Metadata = { title: "Tipe Truk Moving Support — Mandana Admin" };

export default async function MovingTruckClassesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await getCurrentUser();
  const query = parseMovingCatalogQuery(await searchParams);
  const result = await listMovingTruckClasses(query);
  const hasActiveFilters = query.isActive !== undefined;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <MovingCatalogFilters query={query} />
        <Button variant="secondary" asChild>
          <Link href="/moving/truck-classes/new">
            <Plus className="size-4" />
            Tambah tipe truk
          </Link>
        </Button>
      </div>

      {!result.ok ? (
        <ErrorPanel message={errorMessage(result.error)} />
      ) : (
        <MovingTruckClassesTable rows={result.data} hasActiveFilters={hasActiveFilters} />
      )}
    </div>
  );
}

function errorMessage(error: ApiError): string {
  if (error.kind === "network") return "Tidak dapat terhubung ke server.";
  if (error.messages.length > 0) return error.messages.join(" ");
  return "Gagal memuat daftar tipe truk.";
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
      {message}
    </div>
  );
}
