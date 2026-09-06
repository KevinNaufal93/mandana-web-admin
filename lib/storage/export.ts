/**
 * Column mapping for the Smart Storage bookings CSV export. Pure
 * functions over AdminStorageBooking — no server-only, no fetching; see
 * app/actions/booking-exports.ts for the paging/action layer that calls
 * this, and lib/bookings/csv.ts for the primitives used below.
 */
import { csvDate, csvInt } from "@/lib/bookings/csv";
import { STATUS_LABEL } from "@/components/storage/storage-booking-status-badge";
import { toWaNumber } from "@/lib/format";
import type { AdminStorageBooking } from "@/lib/api/storage-bookings";

export const STORAGE_BOOKING_CSV_HEADERS = [
  "Referensi",
  "Status",
  "Tanggal pemesanan",
  "Nama pelanggan",
  "Telepon",
  "Email",
  "Fasilitas",
  "Tipe unit",
  "Jumlah unit",
  "Mulai",
  "Berakhir",
  "Durasi",
  "Satuan durasi",
  "Tarif per satuan",
  "Subtotal",
  "Diskon",
  "Total",
  "Catatan pelanggan",
  "Catatan admin",
  "Dikonfirmasi pada",
  "Dikonfirmasi oleh",
];

export function storageBookingCsvRow(b: AdminStorageBooking): string[] {
  return [
    b.reference,
    STATUS_LABEL[b.status],
    csvDate(b.createdAt),
    b.customerName,
    b.phone ? toWaNumber(b.phone) : "",
    b.email,
    b.facilityName,
    b.unitTypeName,
    csvInt(b.quantity),
    csvDate(b.startDate),
    csvDate(b.endDate),
    csvInt(b.duration),
    b.unitLabel,
    csvInt(b.unitRate),
    csvInt(b.subtotal),
    csvInt(b.discountAmount),
    csvInt(b.total),
    b.notes ?? "",
    b.adminNote ?? "",
    csvDate(b.confirmedAt),
    b.confirmedByName ?? "",
  ];
}

