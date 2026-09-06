"use server";

import { revalidatePath } from "next/cache";
import {
  updateMovingBookingNote,
  confirmMovingBooking,
  rejectMovingBooking,
  cancelMovingBooking,
  completeMovingBooking,
  type AdminMovingBooking,
  type MovingBookingTransitionInput,
} from "@/lib/api/moving-bookings";
import type { ApiError } from "@/lib/api/errors";
import { createLogger } from "@/lib/logger";

const log = createLogger("moving-bookings");

function errorMessage(error: ApiError, copy?: { conflict?: string; fallback?: string }): string {
  if (error.kind === "network") return "Tidak dapat terhubung ke server.";
  if (error.kind === "conflict" && copy?.conflict) return copy.conflict;
  if (error.messages.length > 0) return error.messages.join(" ");
  return copy?.fallback ?? "Gagal menyimpan perubahan.";
}

// Unlike Storage/Event Support, Moving reserves no inventory — a 409 here
// can only mean the booking's status has already moved on since the page
// loaded (e.g. another admin acted on it first), never "not enough
// stock/units". The conflict copy below reflects that: reload, don't retry.
const CONFLICT_COPY = "Status pemesanan ini sudah berubah sejak halaman dimuat. Muat ulang halaman untuk melihat status terbaru.";

export type MovingBookingResult =
  | { ok: true; data: AdminMovingBooking }
  | { ok: false; error: string; conflict?: true };

/** Note-only edit — status changes exclusively through the four transition
 *  actions below. Can still 409 if the booking's status changed underneath
 *  the editing admin, same conflict framing as the transitions. */
export async function updateMovingBookingNoteAction(id: string, input: MovingBookingTransitionInput = {}): Promise<MovingBookingResult> {
  const result = await updateMovingBookingNote(id, input);
  if (!result.ok) {
    log.warn("Update moving booking note failed", { id, kind: result.error.kind });
    return {
      ok: false,
      error: errorMessage(result.error, { conflict: CONFLICT_COPY, fallback: "Gagal menyimpan catatan." }),
      ...(result.error.kind === "conflict" ? { conflict: true as const } : {}),
    };
  }
  revalidatePath(`/moving/bookings/${id}`);
  revalidatePath("/moving/bookings");
  return { ok: true, data: result.data };
}

export async function confirmMovingBookingAction(id: string, input: MovingBookingTransitionInput = {}): Promise<MovingBookingResult> {
  const result = await confirmMovingBooking(id, input);
  if (!result.ok) {
    log.warn("Confirm moving booking failed", { id, kind: result.error.kind });
    return {
      ok: false,
      error: errorMessage(result.error, { conflict: CONFLICT_COPY, fallback: "Gagal mengonfirmasi pemesanan." }),
      ...(result.error.kind === "conflict" ? { conflict: true as const } : {}),
    };
  }
  revalidatePath(`/moving/bookings/${id}`);
  revalidatePath("/moving/bookings");
  return { ok: true, data: result.data };
}

export async function rejectMovingBookingAction(id: string, input: MovingBookingTransitionInput = {}): Promise<MovingBookingResult> {
  const result = await rejectMovingBooking(id, input);
  if (!result.ok) {
    log.warn("Reject moving booking failed", { id, kind: result.error.kind });
    return {
      ok: false,
      error: errorMessage(result.error, { conflict: CONFLICT_COPY, fallback: "Gagal menolak pemesanan." }),
      ...(result.error.kind === "conflict" ? { conflict: true as const } : {}),
    };
  }
  revalidatePath(`/moving/bookings/${id}`);
  revalidatePath("/moving/bookings");
  return { ok: true, data: result.data };
}

export async function cancelMovingBookingAction(id: string, input: MovingBookingTransitionInput = {}): Promise<MovingBookingResult> {
  const result = await cancelMovingBooking(id, input);
  if (!result.ok) {
    log.warn("Cancel moving booking failed", { id, kind: result.error.kind });
    return {
      ok: false,
      error: errorMessage(result.error, { conflict: CONFLICT_COPY, fallback: "Gagal membatalkan pemesanan." }),
      ...(result.error.kind === "conflict" ? { conflict: true as const } : {}),
    };
  }
  revalidatePath(`/moving/bookings/${id}`);
  revalidatePath("/moving/bookings");
  return { ok: true, data: result.data };
}

export async function completeMovingBookingAction(id: string, input: MovingBookingTransitionInput = {}): Promise<MovingBookingResult> {
  const result = await completeMovingBooking(id, input);
  if (!result.ok) {
    log.warn("Complete moving booking failed", { id, kind: result.error.kind });
    return {
      ok: false,
      error: errorMessage(result.error, { conflict: CONFLICT_COPY, fallback: "Gagal menyelesaikan pemesanan." }),
      ...(result.error.kind === "conflict" ? { conflict: true as const } : {}),
    };
  }
  revalidatePath(`/moving/bookings/${id}`);
  revalidatePath("/moving/bookings");
  return { ok: true, data: result.data };
}
