import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AdminEventBooking } from "@/lib/api/event-support-bookings";

/**
 * Renders a stock-conflict 409 from PATCH /confirm as a warning, not a
 * failure — the booking is untouched and still pending, and stock
 * genuinely can free up (another booking gets cancelled), so "try again"
 * is a normal next step here, not a dead end.
 *
 * Best-effort matches the server's message text against this booking's
 * own line item names to offer a direct link to the culprit item. The
 * match is deliberately best-effort: on no match, it degrades to no link
 * rather than mislabeling anything.
 */
export function BookingConflictPanel({
  message,
  booking,
  onRetry,
  onCancel,
  pending,
}: {
  message: string;
  booking: AdminEventBooking;
  onRetry: () => void;
  onCancel: () => void;
  pending: boolean;
}) {
  const culprit = booking.items.find((line) => message.includes(line.itemName)) ?? null;

  return (
    <div role="alert" className="flex flex-col gap-3 rounded-lg border border-accent/60 bg-accent/10 p-4">
      <p className="flex items-start gap-2 text-sm text-primary">
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-accent-foreground" />
        <span>
          <strong>Stok tidak mencukupi.</strong> {message}
        </span>
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {culprit && (
          <Button variant="outlineSecondary" size="sm" asChild>
            <Link href={`/event-support/items/${culprit.itemId}`}>Buka item</Link>
          </Button>
        )}
        <Button variant="secondary" size="sm" onClick={onRetry} disabled={pending}>
          Coba lagi
        </Button>
        <Button variant="outlineSecondary" size="sm" onClick={onCancel} disabled={pending}>
          Batalkan pemesanan
        </Button>
      </div>
    </div>
  );
}
