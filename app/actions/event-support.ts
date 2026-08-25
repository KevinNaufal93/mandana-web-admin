"use server";

import { revalidatePath } from "next/cache";
import {
  getEventCategory,
  createEventCategory,
  updateEventCategory,
  deleteEventCategory,
  getEventItem,
  createEventItem,
  updateEventItem,
  updateEventItemStatus,
  deleteEventItem,
  type AdminEventCategory,
  type AdminEventItem,
  type EventCategoryInput,
  type EventItemCreateInput,
  type EventItemUpdateInput,
} from "@/lib/api/event-support";
import type { EventItemStatus } from "@/lib/event-support/query";
import type { ApiError } from "@/lib/api/errors";
import { createLogger } from "@/lib/logger";

const log = createLogger("event-support");

/**
 * `error.kind === "conflict"` gets its own copy per call site — a 409
 * here is a rule the operator can act on (dependents, non-draft status,
 * live bookings, stock), not a fault. `messages` is the server's English
 * text; used as a fallback when we don't have anything more specific.
 */
function errorMessage(error: ApiError, copy?: { conflict?: string; fallback?: string }): string {
  if (error.kind === "network") return "Tidak dapat terhubung ke server.";
  if (error.kind === "conflict" && copy?.conflict) return copy.conflict;
  if (error.messages.length > 0) return error.messages.join(" ");
  return copy?.fallback ?? "Gagal menyimpan perubahan.";
}

const DUPLICATE_SLUG_COPY = "Slug sudah dipakai. Gunakan slug lain atau kosongkan agar dibuat otomatis.";

export type EventCategoryResult =
  | { ok: true; data: AdminEventCategory }
  | { ok: false; error: string; conflict?: true };

export type EventItemResult = { ok: true; data: AdminEventItem } | { ok: false; error: string; conflict?: true };

// ─── Categories ───────────────────────────────────────────────────────────

/** Every write endpoint's body shape differs slightly from the canonical
 *  read, so — same rule as app/actions/properties.ts's refreshed() — every
 *  mutation re-reads through the one path that's already correct. */
async function refreshedCategory(id: string): Promise<EventCategoryResult> {
  const result = await getEventCategory(id);
  if (!result.ok) return { ok: false, error: errorMessage(result.error) };
  return { ok: true, data: result.data };
}

export async function createEventCategoryAction(input: EventCategoryInput): Promise<EventCategoryResult> {
  const result = await createEventCategory(input);
  if (!result.ok) {
    log.warn("Create event category failed", { kind: result.error.kind });
    return {
      ok: false,
      error: errorMessage(result.error, { conflict: DUPLICATE_SLUG_COPY, fallback: "Gagal membuat kategori." }),
      ...(result.error.kind === "conflict" ? { conflict: true as const } : {}),
    };
  }
  revalidatePath("/event-support/categories");
  return { ok: true, data: result.data };
}

export async function updateEventCategoryAction(id: string, patch: EventCategoryInput): Promise<EventCategoryResult> {
  const result = await updateEventCategory(id, patch);
  if (!result.ok) {
    log.warn("Update event category failed", { id, kind: result.error.kind });
    return {
      ok: false,
      error: errorMessage(result.error, { conflict: DUPLICATE_SLUG_COPY, fallback: "Gagal menyimpan kategori." }),
      ...(result.error.kind === "conflict" ? { conflict: true as const } : {}),
    };
  }
  revalidatePath(`/event-support/categories/${id}`);
  revalidatePath("/event-support/categories");
  return refreshedCategory(id);
}

export async function deleteEventCategoryAction(id: string): Promise<{ ok: true } | { ok: false; error: string; conflict?: true }> {
  const result = await deleteEventCategory(id);
  if (!result.ok) {
    log.warn("Delete event category failed", { id, kind: result.error.kind });
    return {
      ok: false,
      error: errorMessage(result.error, {
        conflict: "Kategori ini masih memiliki item. Pindahkan atau hapus itemnya terlebih dahulu.",
        fallback: "Gagal menghapus kategori.",
      }),
      ...(result.error.kind === "conflict" ? { conflict: true as const } : {}),
    };
  }
  revalidatePath("/event-support/categories");
  return { ok: true };
}

// ─── Items ────────────────────────────────────────────────────────────────

async function refreshedItem(id: string): Promise<EventItemResult> {
  const result = await getEventItem(id);
  if (!result.ok) return { ok: false, error: errorMessage(result.error) };
  return { ok: true, data: result.data };
}

export async function createEventItemAction(input: EventItemCreateInput): Promise<EventItemResult> {
  const result = await createEventItem(input);
  if (!result.ok) {
    log.warn("Create event item failed", { kind: result.error.kind });
    return {
      ok: false,
      error: errorMessage(result.error, { conflict: DUPLICATE_SLUG_COPY, fallback: "Gagal membuat item." }),
      ...(result.error.kind === "conflict" ? { conflict: true as const } : {}),
    };
  }
  revalidatePath("/event-support/items");
  return { ok: true, data: result.data };
}

/** 409 unless the item is currently a draft. */
export async function updateEventItemAction(id: string, patch: EventItemUpdateInput): Promise<EventItemResult> {
  const result = await updateEventItem(id, patch);
  if (!result.ok) {
    log.warn("Update event item failed", { id, kind: result.error.kind });
    return {
      ok: false,
      error: errorMessage(result.error, {
        conflict: "Item harus berstatus draf sebelum dapat diubah. Muat ulang halaman ini.",
        fallback: "Gagal menyimpan item.",
      }),
      ...(result.error.kind === "conflict" ? { conflict: true as const } : {}),
    };
  }
  revalidatePath(`/event-support/items/${id}`);
  revalidatePath("/event-support/items");
  return refreshedItem(id);
}

/** The only endpoint that moves status. A 409 here means either an
 *  illegal transition (shouldn't be reachable from this UI) or an
 *  archive attempt blocked by a live booking. */
export async function updateEventItemStatusAction(id: string, status: EventItemStatus): Promise<EventItemResult> {
  const result = await updateEventItemStatus(id, status);
  if (!result.ok) {
    log.warn("Update event item status failed", { id, status, kind: result.error.kind });
    const conflictCopy =
      status === "archived"
        ? "Item ini masih memiliki pemesanan aktif. Selesaikan atau batalkan pemesanan tersebut sebelum mengarsipkan."
        : "Perubahan status ini tidak diizinkan.";
    return {
      ok: false,
      error: errorMessage(result.error, { conflict: conflictCopy, fallback: "Gagal mengubah status item." }),
      ...(result.error.kind === "conflict" ? { conflict: true as const } : {}),
    };
  }
  revalidatePath(`/event-support/items/${id}`);
  revalidatePath("/event-support/items");
  return refreshedItem(id);
}

export async function deleteEventItemAction(id: string): Promise<{ ok: true } | { ok: false; error: string; conflict?: true }> {
  const result = await deleteEventItem(id);
  if (!result.ok) {
    log.warn("Delete event item failed", { id, kind: result.error.kind });
    // The server message names the booking count — genuinely useful, so
    // it's appended rather than replaced.
    const conflictCopy =
      result.error.kind === "conflict" && result.error.messages.length > 0
        ? `Item ini sudah dipakai pada pemesanan dan tidak dapat dihapus — arsipkan saja. (${result.error.messages.join(" ")})`
        : "Item ini sudah dipakai pada pemesanan dan tidak dapat dihapus — arsipkan saja.";
    return {
      ok: false,
      error: errorMessage(result.error, { conflict: conflictCopy, fallback: "Gagal menghapus item." }),
      ...(result.error.kind === "conflict" ? { conflict: true as const } : {}),
    };
  }
  revalidatePath("/event-support/items");
  return { ok: true };
}
