import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { listMovingAddons } from "@/lib/api/moving";
import { parseMovingCatalogQuery } from "@/lib/moving/query";
import { MovingCatalogFilters } from "@/components/moving/moving-catalog-filters";
import { MovingAddonsTable } from "@/components/moving/moving-addons-table";
import { Button } from "@/components/ui/button";
import type { ApiError } from "@/lib/api/errors";

export const metadata: Metadata = { title: "Add-on Moving Support — Mandana Admin" };

export default async function MovingAddonsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await getCurrentUser();
  const query = parseMovingCatalogQuery(await searchParams);
  const result = await listMovingAddons(query);
  const hasActiveFilters = query.isActive !== undefined;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <MovingCatalogFilters query={query} />
        <Button variant="secondary" asChild>
          <Link href="/moving/addons/new">
            <Plus className="size-4" />
            Tambah add-on
          </Link>
        </Button>
      </div>

      {!result.ok ? (
        <ErrorPanel message={errorMessage(result.error)} />
      ) : (
        <MovingAddonsTable rows={result.data} hasActiveFilters={hasActiveFilters} />
      )}
    </div>
  );
}

function errorMessage(error: ApiError): string {
  if (error.kind === "network") return "Tidak dapat terhubung ke server.";
  if (error.messages.length > 0) return error.messages.join(" ");
  return "Gagal memuat daftar add-on.";
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
      {message}
    </div>
  );
}
