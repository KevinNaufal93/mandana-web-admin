"use server";

import { revalidatePath } from "next/cache";
import {
  createEventBooking,
  confirmEventBooking,
  cancelEventBooking,
  completeEventBooking,
  type AdminEventBooking,
  type EventBookingCreateInput,
  type EventBookingTransitionInput,
} from "@/lib/api/event-support-bookings";
import type { ApiError } from "@/lib/api/errors";
import { createLogger } from "@/lib/logger";

const log = createLogger("event-support-bookings");

function errorMessage(error: ApiError, copy?: { conflict?: string; fallback?: string }): string {
  if (error.kind === "network") return "Tidak dapat terhubung ke server.";
  if (error.kind === "conflict" && copy?.conflict) return copy.conflict;
  if (error.messages.length > 0) return error.messages.join(" ");
  return copy?.fallback ?? "Gagal menyimpan perubahan.";
}

export type EventBookingResult = { ok: true; data: AdminEventBooking } | { ok: false; error: string; conflict?: true };

export async function createEventBookingAction(input: EventBookingCreateInput): Promise<EventBookingResult> {
  const result = await createEventBooking(input);
  if (!result.ok) {
    log.warn("Create event booking failed", { kind: result.error.kind });
    return {
      ok: false,
      error: errorMessage(result.error, { fallback: "Gagal mencatat pemesanan." }),
    };
  }
  revalidatePath("/event-support/bookings");
  return { ok: true, data: result.data };
}

/**
 * The only transition that can 409 in the ordinary course of business —
 * confirm re-checks live availability and claims stock atomically. That
 * 409 is framed as a warning (conflict: true), not a failure: the
 * booking is untouched and still pending, and the server's message
 * carries the item name, remaining count, and dates — none of which are
 * reproducible client-side, so it's kept verbatim inside an Indonesian
 * frame rather than translated.
 */
export async function confirmEventBookingAction(id: string, input: EventBookingTransitionInput = {}): Promise<EventBookingResult> {
  const result = await confirmEventBooking(id, input);
  if (!result.ok) {
    log.warn("Confirm event booking failed", { id, kind: result.error.kind });
    const conflictCopy =
      result.error.kind !== "network" && result.error.messages.length > 0
        ? `Stok tidak mencukupi untuk salah satu item. Detail dari server: ${result.error.messages.join(" ")}`
        : "Stok tidak mencukupi untuk salah satu item pada tanggal yang dipilih.";
    return {
      ok: false,
      error: errorMessage(result.error, { conflict: conflictCopy, fallback: "Gagal mengonfirmasi pemesanan." }),
      ...(result.error.kind === "conflict" ? { conflict: true as const } : {}),
    };
  }
  revalidatePath(`/event-support/bookings/${id}`);
  revalidatePath("/event-support/bookings");
  return { ok: true, data: result.data };
}

export async function cancelEventBookingAction(id: string, input: EventBookingTransitionInput = {}): Promise<EventBookingResult> {
  const result = await cancelEventBooking(id, input);
  if (!result.ok) {
    log.warn("Cancel event booking failed", { id, kind: result.error.kind });
    return { ok: false, error: errorMessage(result.error, { fallback: "Gagal membatalkan pemesanan." }) };
  }
  revalidatePath(`/event-support/bookings/${id}`);
  revalidatePath("/event-support/bookings");
  return { ok: true, data: result.data };
}

export async function completeEventBookingAction(id: string, input: EventBookingTransitionInput = {}): Promise<EventBookingResult> {
  const result = await completeEventBooking(id, input);
  if (!result.ok) {
    log.warn("Complete event booking failed", { id, kind: result.error.kind });
    return { ok: false, error: errorMessage(result.error, { fallback: "Gagal menyelesaikan pemesanan." }) };
  }
  revalidatePath(`/event-support/bookings/${id}`);
  revalidatePath("/event-support/bookings");
  return { ok: true, data: result.data };
}
