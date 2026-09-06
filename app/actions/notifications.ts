"use server";

import { revalidatePath } from "next/cache";
import {
  markAllNotificationsRead,
  markNotificationRead,
  mintNotificationStreamTicket,
  type NotificationStreamTicket,
} from "@/lib/api/notifications";
import type { ApiError } from "@/lib/api/errors";
import { createLogger } from "@/lib/logger";

const log = createLogger("notifications");

function errorMessage(error: ApiError, fallback: string): string {
  if (error.kind === "network") return "Tidak dapat terhubung ke server.";
  if (error.messages.length > 0) return error.messages.join(" ");
  return fallback;
}

export type NotificationActionResult = { ok: true } | { ok: false; error: string };

/**
 * Called by the client dropdown on mount and on every EventSource
 * reconnect -- the ticket is single-purpose and expires in 60s, so a fresh
 * one is minted each time rather than cached across reconnects.
 */
export async function mintStreamTicketAction(): Promise<
  { ok: true; data: NotificationStreamTicket } | { ok: false; error: string }
> {
  const result = await mintNotificationStreamTicket();
  if (!result.ok) {
    log.warn("Mint notification stream ticket failed", { kind: result.error.kind });
    return { ok: false, error: errorMessage(result.error, "Gagal membuka koneksi notifikasi.") };
  }
  return { ok: true, data: result.data };
}

/**
 * Colours one row read -- never resolves it (see markAllNotificationsReadAction
 * for the same distinction). revalidatePath only touches /notifications: the
 * bell itself updates live from its own EventSource, including the
 * notification.read event this call's own request causes to be broadcast
 * back.
 */
export async function markNotificationReadAction(id: string): Promise<NotificationActionResult> {
  const result = await markNotificationRead(id);
  if (!result.ok) {
    log.warn("Mark notification read failed", { id, kind: result.error.kind });
    return { ok: false, error: errorMessage(result.error, "Gagal menandai notifikasi sebagai dibaca.") };
  }
  revalidatePath("/notifications");
  return { ok: true };
}

/**
 * What opening the bell calls. Colours every currently-unread notification
 * read, for every admin (read state is global, not per-admin) -- and does
 * NOT touch unresolvedCount. That separation is the entire feature: an
 * admin who opens the bell and moves on must still see the real number of
 * bookings nobody has processed yet.
 */
export async function markAllNotificationsReadAction(): Promise<NotificationActionResult> {
  const result = await markAllNotificationsRead();
  if (!result.ok) {
    log.warn("Mark all notifications read failed", { kind: result.error.kind });
    return { ok: false, error: errorMessage(result.error, "Gagal menandai semua notifikasi sebagai dibaca.") };
  }
  revalidatePath("/notifications");
  return { ok: true };
}
