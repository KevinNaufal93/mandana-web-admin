import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AdminStorageBooking } from "@/lib/api/storage-bookings";

/**
 * Renders a stock-conflict 409 from PATCH /confirm as a warning, not a
 * failure — the booking is untouched and still pending, and stock
 * genuinely can free up (another booking gets rejected/cancelled), so
 * "try again" is a normal next step here, not a dead end. Copy of
 * components/event-support/booking-conflict-panel.tsx, adjusted for
 * storage's single facility/unit-type/quantity shape (no line items to
 * search for a culprit).
 *
 * The units list filters by facilityId/unitTypeId (uuid), but this DTO
 * only carries facilitySlug/unitTypeSlug — no id to build a precise deep
 * link from without an extra lookup, so this links to the unfiltered
 * units list rather than guessing.
 */
export function StorageBookingConflictPanel({
  message,
  booking,
  onRetry,
  onReject,
  pending,
}: {
  message: string;
  booking: AdminStorageBooking;
  onRetry: () => void;
  onReject: () => void;
  pending: boolean;
}) {
  return (
    <div role="alert" className="flex flex-col gap-3 rounded-lg border border-accent/60 bg-accent/10 p-4">
      <p className="flex items-start gap-2 text-sm text-primary">
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-accent-foreground" />
        <span>
          <strong>Unit tidak mencukupi.</strong> {message}
        </span>
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outlineSecondary" size="sm" asChild>
          <Link href="/storage/units?status=available">
            Lihat unit tersedia ({booking.facilityName} · {booking.unitTypeName})
          </Link>
        </Button>
        <Button variant="secondary" size="sm" onClick={onRetry} disabled={pending}>
          Coba lagi
        </Button>
        <Button variant="outlineSecondary" size="sm" onClick={onReject} disabled={pending}>
          Tolak pemesanan
        </Button>
      </div>
    </div>
  );
}
