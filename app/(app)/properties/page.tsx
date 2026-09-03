import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { listAdminProperties, listPropertyTypes } from "@/lib/api/properties";
import { parsePropertyQuery } from "@/lib/properties/query";
import { PropertyFilters } from "@/components/properties/property-filters";
import { PropertiesTable } from "@/components/properties/properties-table";
import { PropertiesPagination } from "@/components/properties/properties-pagination";
import { Button } from "@/components/ui/button";
import type { ApiError } from "@/lib/api/errors";

export const metadata: Metadata = { title: "Manajemen Properti — Mandana Admin" };

// Every page under (app) opens with getCurrentUser() — the render-time
// security boundary; see app/(app)/page.tsx.
export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await getCurrentUser();
  const query = parsePropertyQuery(await searchParams);

  // Fired in parallel: the filter dropdown's options don't depend on the
  // list result, and vice versa.
  const [propertiesResult, typesResult] = await Promise.all([
    listAdminProperties(query),
    listPropertyTypes(),
  ]);

  const propertyTypes = typesResult.ok ? typesResult.data : [];
  const hasActiveFilters = Boolean(
    query.status || query.listingType || query.search || query.propertyTypeId,
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Manajemen Properti</h1>
          <p className="text-sm text-muted-foreground">Daftar seluruh listing properti Mandana.</p>
        </div>
        <Button variant="secondary" asChild>
          <Link href="/properties/new">
            <Plus className="size-4" />
            Properti baru
          </Link>
        </Button>
      </div>

      <PropertyFilters query={query} propertyTypes={propertyTypes} />

      {!propertiesResult.ok ? (
        <ErrorPanel message={errorMessage(propertiesResult.error)} />
      ) : (
        <>
          <PropertiesTable rows={propertiesResult.data.items} hasActiveFilters={hasActiveFilters} />
          <PropertiesPagination query={query} meta={propertiesResult.data.meta} basePath="/properties" />
        </>
      )}
    </div>
  );
}

function errorMessage(error: ApiError): string {
  if (error.kind === "network") return "Tidak dapat terhubung ke server.";
  if (error.messages.length > 0) return error.messages.join(" ");
  return "Gagal memuat daftar properti.";
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
    >
      {message}
    </div>
  );
}
