import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { listEventBookings } from "@/lib/api/event-support-bookings";
import { parseEventBookingQuery } from "@/lib/event-support/query";
import { BookingFilters } from "@/components/event-support/booking-filters";
import { BookingsTable } from "@/components/event-support/bookings-table";
import { BookingsPagination } from "@/components/event-support/bookings-pagination";
import { Button } from "@/components/ui/button";
import type { ApiError } from "@/lib/api/errors";

export const metadata: Metadata = { title: "Pemesanan Event Support — Mandana Admin" };

export default async function EventBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await getCurrentUser();
  const query = parseEventBookingQuery(await searchParams);
  const result = await listEventBookings(query);
  const hasActiveFilters = Boolean(query.status || query.from || query.to || query.search);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BookingFilters query={query} />
        <Button variant="secondary" asChild>
          <Link href="/event-support/bookings/new">
            <Plus className="size-4" />
            Catat pemesanan
          </Link>
        </Button>
      </div>

      {!result.ok ? (
        <ErrorPanel message={errorMessage(result.error)} />
      ) : (
        <>
          <BookingsTable rows={result.data.items} hasActiveFilters={hasActiveFilters} />
          <BookingsPagination query={query} meta={result.data.meta} basePath="/event-support/bookings" />
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
