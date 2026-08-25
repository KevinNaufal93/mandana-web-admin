import { Badge } from "@/components/ui/badge";
import type { EventBookingStatus } from "@/lib/event-support/query";

const STATUS_LABEL: Record<EventBookingStatus, string> = {
  pending: "Menunggu",
  confirmed: "Terkonfirmasi",
  cancelled: "Dibatalkan",
  completed: "Selesai",
};

const STATUS_VARIANT: Record<EventBookingStatus, "outline" | "default" | "secondary" | "accent"> = {
  pending: "outline",
  confirmed: "default",
  cancelled: "secondary",
  completed: "accent",
};

/**
 * Explicit fallback for a status value outside the known enum — the
 * sibling storage module in this API has a fifth booking-like status
 * ("rejected") that event-support may or may not gain later. A bare
 * Record index would render `undefined` instead of degrading gracefully.
 */
export function BookingStatusBadge({ status }: { status: EventBookingStatus | (string & {}) }) {
  const known = status in STATUS_LABEL;
  return (
    <Badge variant={known ? STATUS_VARIANT[status as EventBookingStatus] : "outline"}>
      {known ? STATUS_LABEL[status as EventBookingStatus] : status}
    </Badge>
  );
}
