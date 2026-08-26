"use server";

import { revalidatePath } from "next/cache";
import {
  confirmStorageBooking,
  rejectStorageBooking,
  cancelStorageBooking,
  completeStorageBooking,
  type AdminStorageBooking,
  type StorageBookingTransitionInput,
} from "@/lib/api/storage-bookings";
import type { ApiError } from "@/lib/api/errors";
import { createLogger } from "@/lib/logger";

const log = createLogger("storage-bookings");

function errorMessage(error: ApiError, copy?: { conflict?: string; fallback?: string }): string {
  if (error.kind === "network") return "Tidak dapat terhubung ke server.";
  if (error.kind === "conflict" && copy?.conflict) return copy.conflict;
  if (error.messages.length > 0) return error.messages.join(" ");
  return copy?.fallback ?? "Gagal menyimpan perubahan.";
}

export type StorageBookingResult =
  | { ok: true; data: AdminStorageBooking }
  | { ok: false; error: string; conflict?: true };

/**
 * The only transition that can 409 in the ordinary course of business —
 * confirm re-checks live unit availability and allocates atomically. That
 * 409 is framed as a warning (conflict: true), not a failure: the
 * booking is untouched and still pending, and stock genuinely can free up
 * (another booking gets rejected/cancelled) — same framing as
 * confirmEventBookingAction in app/actions/event-support-bookings.ts.
 */
export async function confirmStorageBookingAction(id: string, input: StorageBookingTransitionInput = {}): Promise<StorageBookingResult> {
  const result = await confirmStorageBooking(id, input);
  if (!result.ok) {
    log.warn("Confirm storage booking failed", { id, kind: result.error.kind });
    const conflictCopy =
      result.error.kind !== "network" && result.error.messages.length > 0
        ? `Unit tersedia tidak mencukupi. Detail dari server: ${result.error.messages.join(" ")}`
        : "Unit tersedia tidak mencukupi untuk jumlah dan tanggal yang dipesan.";
    return {
      ok: false,
      error: errorMessage(result.error, { conflict: conflictCopy, fallback: "Gagal mengonfirmasi pemesanan." }),
      ...(result.error.kind === "conflict" ? { conflict: true as const } : {}),
    };
  }
  revalidatePath(`/storage/bookings/${id}`);
  revalidatePath("/storage/bookings");
  revalidatePath("/storage/units");
  revalidatePath("/storage");
  return { ok: true, data: result.data };
}

export async function rejectStorageBookingAction(id: string, input: StorageBookingTransitionInput = {}): Promise<StorageBookingResult> {
  const result = await rejectStorageBooking(id, input);
  if (!result.ok) {
    log.warn("Reject storage booking failed", { id, kind: result.error.kind });
    return { ok: false, error: errorMessage(result.error, { fallback: "Gagal menolak pemesanan." }) };
  }
  revalidatePath(`/storage/bookings/${id}`);
  revalidatePath("/storage/bookings");
  return { ok: true, data: result.data };
}

export async function cancelStorageBookingAction(id: string, input: StorageBookingTransitionInput = {}): Promise<StorageBookingResult> {
  const result = await cancelStorageBooking(id, input);
  if (!result.ok) {
    log.warn("Cancel storage booking failed", { id, kind: result.error.kind });
    return { ok: false, error: errorMessage(result.error, { fallback: "Gagal membatalkan pemesanan." }) };
  }
  revalidatePath(`/storage/bookings/${id}`);
  revalidatePath("/storage/bookings");
  revalidatePath("/storage/units");
  revalidatePath("/storage");
  return { ok: true, data: result.data };
}

export async function completeStorageBookingAction(id: string, input: StorageBookingTransitionInput = {}): Promise<StorageBookingResult> {
  const result = await completeStorageBooking(id, input);
  if (!result.ok) {
    log.warn("Complete storage booking failed", { id, kind: result.error.kind });
    return { ok: false, error: errorMessage(result.error, { fallback: "Gagal menyelesaikan pemesanan." }) };
  }
  revalidatePath(`/storage/bookings/${id}`);
  revalidatePath("/storage/bookings");
  revalidatePath("/storage/units");
  revalidatePath("/storage");
  return { ok: true, data: result.data };
}
