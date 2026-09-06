"use server";

import { renderToBuffer } from "@react-pdf/renderer";
import { getCurrentUser } from "@/lib/auth/dal";
import { getStorageBooking } from "@/lib/api/storage-bookings";
import { getMovingBooking } from "@/lib/api/moving-bookings";
import { getEventBooking } from "@/lib/api/event-support-bookings";
import { StorageBookingPdfDocument } from "@/lib/storage/pdf-document";
import { MovingBookingPdfDocument } from "@/lib/moving/pdf-document";
import { EventBookingPdfDocument } from "@/lib/event-support/pdf-document";
import type { ApiError } from "@/lib/api/errors";
import { createLogger } from "@/lib/logger";

const log = createLogger("booking-pdfs");

/**
 * Mirrors app/actions/booking-exports.ts's shape throughout — same result
 * envelope, same errorMessage() copy, same "no revalidatePath" rationale
 * (this reads a booking and changes nothing). The one structural
 * difference: a PDF is bytes, not a string, so `data` carries a base64
 * payload instead of a ready-to-download CSV string; see
 * components/bookings/download-booking-pdf-button.tsx for the client
 * side that decodes it back into a Blob.
 *
 * This file is .tsx (not .ts, unlike booking-exports.ts) because building
 * a <XBookingPdfDocument /> element requires JSX.
 */
export type BookingPdfResult =
  | { ok: true; data: { pdfBase64: string; filename: string } }
  | { ok: false; error: string };

function errorMessage(error: ApiError): string {
  if (error.kind === "network") return "Tidak dapat terhubung ke server.";
  if (error.messages.length > 0) return error.messages.join(" ");
  return "Gagal membuat PDF.";
}

/** Booking references look like "ES-2026-0142" today (already filename-safe),
 *  but this is a defensive floor rather than a trust assumption — strips
 *  anything a filesystem or download manager could choke on. */
function sanitizeFilename(reference: string): string {
  return reference.replace(/[^A-Za-z0-9._-]/g, "_");
}

export async function exportEventBookingPdfAction(id: string): Promise<BookingPdfResult> {
  await getCurrentUser();
  const result = await getEventBooking(id);
  if (!result.ok) {
    log.warn("Generate event-support booking PDF failed", { kind: result.error.kind });
    return { ok: false, error: errorMessage(result.error) };
  }
  const buffer = await renderToBuffer(<EventBookingPdfDocument booking={result.data} />);
  return {
    ok: true,
    data: { pdfBase64: buffer.toString("base64"), filename: `pemesanan-${sanitizeFilename(result.data.reference)}.pdf` },
  };
}

export async function exportMovingBookingPdfAction(id: string): Promise<BookingPdfResult> {
  await getCurrentUser();
  const result = await getMovingBooking(id);
  if (!result.ok) {
    log.warn("Generate moving booking PDF failed", { kind: result.error.kind });
    return { ok: false, error: errorMessage(result.error) };
  }
  const buffer = await renderToBuffer(<MovingBookingPdfDocument booking={result.data} />);
  return {
    ok: true,
    data: { pdfBase64: buffer.toString("base64"), filename: `pemesanan-${sanitizeFilename(result.data.reference)}.pdf` },
  };
}

export async function exportStorageBookingPdfAction(id: string): Promise<BookingPdfResult> {
  await getCurrentUser();
  const result = await getStorageBooking(id);
  if (!result.ok) {
    log.warn("Generate storage booking PDF failed", { kind: result.error.kind });
    return { ok: false, error: errorMessage(result.error) };
  }
  const buffer = await renderToBuffer(<StorageBookingPdfDocument booking={result.data} />);
  return {
    ok: true,
    data: { pdfBase64: buffer.toString("base64"), filename: `pemesanan-${sanitizeFilename(result.data.reference)}.pdf` },
  };
}
