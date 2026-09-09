import type { Metadata } from "next";
import { requireModule } from "@/lib/auth/dal";
import { listStorageBookings } from "@/lib/api/storage-bookings";
import { listStorageFacilities, listStorageUnitTypes } from "@/lib/api/storage";
import { parseStorageBookingQuery, toStorageBookingSearchString } from "@/lib/storage/query";
import { exportStorageBookingsAction } from "@/app/actions/booking-exports";
import { StorageBookingFilters } from "@/components/storage/storage-booking-filters";
import { StorageBookingsTable } from "@/components/storage/storage-bookings-table";
import { Pagination } from "@/components/ui/pagination";
import { ExportBookingsButton } from "@/components/bookings/export-bookings-button";
import type { ApiError } from "@/lib/api/errors";

export const metadata: Metadata = { title: "Pemesanan Mandana Space — Mandana Admin" };

// No "+ Tambah" button anywhere on this page — unlike Event Support,
// there is no admin-create endpoint for storage bookings (they only
// originate from the public POST /storage/bookings). See
// docs/storage-admin-integration-plan.md's contract table.
export default async function StorageBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireModule("storage");
  const query = parseStorageBookingQuery(await searchParams);

  const [bookingsResult, facilitiesResult, unitTypesResult] = await Promise.all([
    listStorageBookings(query),
    listStorageFacilities(),
    listStorageUnitTypes(),
  ]);

  const facilities = facilitiesResult.ok ? facilitiesResult.data : [];
  const unitTypes = unitTypesResult.ok ? unitTypesResult.data : [];
  const hasActiveFilters = Boolean(
    query.status || query.facilitySlug || query.unitTypeSlug || query.search || query.from || query.to,
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <StorageBookingFilters query={query} facilities={facilities} unitTypes={unitTypes} />
        <ExportBookingsButton action={exportStorageBookingsAction} searchString={toStorageBookingSearchString(query, {})} />
      </div>

      {!bookingsResult.ok ? (
        <ErrorPanel message={errorMessage(bookingsResult.error)} />
      ) : (
        <>
          <StorageBookingsTable
            rows={bookingsResult.data.items}
            hasActiveFilters={hasActiveFilters}
            query={query}
            basePath="/storage/bookings"
          />
          <Pagination meta={bookingsResult.data.meta} noun="pemesanan" hrefForPage={(page) => `/storage/bookings${toStorageBookingSearchString(query, { page })}`} />
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
