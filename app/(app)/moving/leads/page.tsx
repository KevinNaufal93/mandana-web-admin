import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/dal";
import { listMovingLeads } from "@/lib/api/moving-leads";
import { parseMovingLeadQuery } from "@/lib/moving/query";
import { MovingLeadFilters } from "@/components/moving/moving-lead-filters";
import { MovingLeadsTable } from "@/components/moving/moving-leads-table";
import { MovingLeadsPagination } from "@/components/moving/moving-leads-pagination";
import type { ApiError } from "@/lib/api/errors";

export const metadata: Metadata = { title: "Lead Moving Support — Mandana Admin" };

// No "+ Tambah" button anywhere on this page — same as storage/bookings —
// there is no admin-create endpoint for leads, they only originate from
// the public quote-capture flow. Unlike storage/bookings' filter page, no
// secondary lookups here (no facility/unit-type dropdowns to hydrate) —
// every filter is self-contained.
export default async function MovingLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await getCurrentUser();
  const query = parseMovingLeadQuery(await searchParams);
  const result = await listMovingLeads(query);
  const hasActiveFilters = Boolean(query.status || query.search || query.from || query.to);

  return (
    <div className="flex flex-col gap-6">
      <MovingLeadFilters query={query} />

      {!result.ok ? (
        <ErrorPanel message={errorMessage(result.error)} />
      ) : (
        <>
          <MovingLeadsTable rows={result.data.items} hasActiveFilters={hasActiveFilters} />
          <MovingLeadsPagination query={query} meta={result.data.meta} basePath="/moving/leads" />
        </>
      )}
    </div>
  );
}

function errorMessage(error: ApiError): string {
  if (error.kind === "network") return "Tidak dapat terhubung ke server.";
  if (error.messages.length > 0) return error.messages.join(" ");
  return "Gagal memuat daftar lead.";
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
      {message}
    </div>
  );
}
