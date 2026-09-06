/**
 * Column mapping for the Event Support bookings CSV export. Pure
 * functions over AdminEventBooking — no server-only; see
 * app/actions/booking-exports.ts for the paging/action layer and
 * lib/bookings/csv.ts for the primitives used below.
 */
import { csvDate, csvDateTime, csvInt, csvList } from "@/lib/bookings/csv";
import { STATUS_LABEL } from "@/components/event-support/booking-status-badge";
import { toWaNumber } from "@/lib/format";
import type { AdminEventBooking } from "@/lib/api/event-support-bookings";

/** Exported so the booking PDF export (lib/event-support/pdf-document.tsx)
 *  can reuse this copy for its own Metadata section instead of keeping a
 *  second copy that could drift from this one. */
export const SOURCE_LABEL: Record<AdminEventBooking["source"], string> = {
  public: "Diajukan pelanggan",
  admin: "Dicatat admin",
};

export const EVENT_BOOKING_CSV_HEADERS = [
  "Referensi",
  "Status",
  "Sumber",
  "Tanggal pemesanan",
  "Nama pelanggan",
  "Telepon",
  "Email",
  "Lokasi acara",
  "Mulai acara",
  "Selesai acara",
  "Dropoff",
  "Pickup",
  "Item",
  "Jumlah item",
  "Subtotal",
  "Diskon",
  "Total",
  "Catatan pelanggan",
  "Catatan admin",
  "Dibuat oleh",
  "Dikonfirmasi pada",
  "Dikonfirmasi oleh",
];

export function eventBookingCsvRow(b: AdminEventBooking): string[] {
  return [
    b.reference,
    // event-support's status enum lacks "rejected", so STATUS_LABEL is
    // total over it — no fallback needed here the way
    // BookingStatusBadge's component render needs one.
    STATUS_LABEL[b.status],
    SOURCE_LABEL[b.source],
    csvDate(b.createdAt),
    b.customerName,
    b.phone ? toWaNumber(b.phone) : "",
    b.email ?? "",
    b.eventLocation ?? "",
    csvDate(b.startDate),
    csvDate(b.endDate),
    csvDateTime(b.dropoffAt),
    csvDateTime(b.pickupAt),
    csvList(b.items.map((i) => `${i.itemName} x${i.quantity}`)),
    csvInt(b.items.length),
    csvInt(b.subtotal),
    csvInt(b.discountAmount),
    csvInt(b.total),
    b.notes ?? "",
    b.adminNote ?? "",
    b.createdByName ?? "",
    csvDate(b.confirmedAt),
    b.confirmedByName ?? "",
  ];
}
