import type { Metadata } from "next";
import { requireModule } from "@/lib/auth/dal";
import { listMovingBookings } from "@/lib/api/moving-bookings";
import { parseMovingBookingQuery, toMovingBookingSearchString } from "@/lib/moving/query";
import { exportMovingBookingsAction } from "@/app/actions/booking-exports";
import { MovingBookingFilters } from "@/components/moving/moving-booking-filters";
import { MovingBookingsTable } from "@/components/moving/moving-bookings-table";
import { Pagination } from "@/components/ui/pagination";
import { ExportBookingsButton } from "@/components/bookings/export-bookings-button";
import type { ApiError } from "@/lib/api/errors";

export const metadata: Metadata = { title: "Pemesanan Moving Support — Mandana Admin" };

// No "+ Tambah" button anywhere on this page — same as storage/bookings —
// there is no admin-create endpoint for bookings, they only originate from
// the public quote-capture flow. Unlike storage/bookings' filter page, no
// secondary lookups here (no facility/unit-type dropdowns to hydrate) —
// every filter is self-contained.
export default async function MovingBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireModule("moving");
  const query = parseMovingBookingQuery(await searchParams);
  const result = await listMovingBookings(query);
  const hasActiveFilters = Boolean(query.status || query.search || query.from || query.to);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <MovingBookingFilters query={query} />
        <ExportBookingsButton action={exportMovingBookingsAction} searchString={toMovingBookingSearchString(query, {})} />
      </div>

      {!result.ok ? (
        <ErrorPanel message={errorMessage(result.error)} />
      ) : (
        <>
          <MovingBookingsTable
            rows={result.data.items}
            hasActiveFilters={hasActiveFilters}
            query={query}
            basePath="/moving/bookings"
          />
          <Pagination meta={result.data.meta} noun="pemesanan" hrefForPage={(page) => `/moving/bookings${toMovingBookingSearchString(query, { page })}`} />
        </>
      )}
    </div>
  );
}

function errorMessage(error: ApiError): string {
  if (error.kind === "network") return "Tidak dapat terhubung ke server.";
  if (error.messages.length > 0) return error.messages.join(" ");
  return "Gagal memuat daftar pemesanan.";
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
      {message}
    </div>
  );
}
