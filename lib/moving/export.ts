/**
 * Column mapping for the Moving Support bookings CSV export. Pure
 * functions over AdminMovingBooking — no server-only; see
 * app/actions/booking-exports.ts for the paging/action layer and
 * lib/bookings/csv.ts for the primitives used below.
 *
 * Moving is the only module with THREE nested lists (destinations,
 * addons, legs) — legs (the per-leg fare breakdown) is intentionally left
 * out of the export: it's an internal pricing derivation, not something
 * an admin reports on, and baseFare/distanceFare/tollFare below already
 * summarize the same money. destinations and addons each collapse into
 * one cell (see the "one row per pemesanan" decision).
 */
import { csvBool, csvDate, csvInt, csvList } from "@/lib/bookings/csv";
import { STATUS_LABEL } from "@/components/moving/moving-booking-status-badge";
import { toWaNumber } from "@/lib/format";
import type { AdminMovingBooking } from "@/lib/api/moving-bookings";

export const MOVING_BOOKING_CSV_HEADERS = [
  "Referensi",
  "Status",
  "Tanggal pemesanan",
  "Nama pelanggan",
  "Telepon",
  "Email",
  "Truk",
  "Alamat penjemputan",
  "Tujuan",
  "Jumlah tujuan",
  "Jarak (km)",
  "Pulang-pergi",
  "Rute tol",
  "Tarif dasar",
  "Tarif jarak",
  "Tarif tol",
  "Add-on",
  "Total add-on",
  "Subtotal",
  "Total",
  "Catatan pelanggan",
  "Catatan admin",
  "Dikonfirmasi pada",
  "Dikonfirmasi oleh",
];

export function movingBookingCsvRow(b: AdminMovingBooking): string[] {
  return [
    b.reference,
    STATUS_LABEL[b.status],
    csvDate(b.createdAt),
    b.customerName ?? "",
    b.phone ? toWaNumber(b.phone) : "",
    b.email ?? "",
    b.truckName,
    b.pickupAddress ?? "",
    csvList(b.destinations.map((d) => d.address)),
    csvInt(b.destinations.length),
    csvInt(b.distanceKm),
    csvBool(b.roundTrip),
    csvBool(b.tollRoute),
    csvInt(b.baseFare),
    csvInt(b.distanceFare),
    csvInt(b.tollFare),
    csvList(b.addons.map((a) => `${a.name} x${a.quantity}`)),
    csvInt(b.addonsTotal),
    csvInt(b.subtotal),
    csvInt(b.total),
    b.notes ?? "",
    b.adminNote ?? "",
    csvDate(b.confirmedAt),
    b.confirmedByName ?? "",
  ];
}
