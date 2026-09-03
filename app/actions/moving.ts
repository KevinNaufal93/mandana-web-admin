"use server";

import { revalidatePath } from "next/cache";
import {
  getMovingTruckClass,
  createMovingTruckClass,
  updateMovingTruckClass,
  deleteMovingTruckClass,
  getMovingAddon,
  createMovingAddon,
  updateMovingAddon,
  deleteMovingAddon,
  type AdminMovingTruckClass,
  type AdminMovingAddon,
  type MovingTruckClassInput,
  type MovingAddonInput,
} from "@/lib/api/moving";
import type { ApiError } from "@/lib/api/errors";
import { createLogger } from "@/lib/logger";

const log = createLogger("moving");

/** Copy of app/actions/storage.ts's errorMessage() — see that file's
 *  header comment for why `conflict` gets its own copy per call site
 *  rather than the server's raw English text. */
function errorMessage(error: ApiError, copy?: { conflict?: string; fallback?: string }): string {
  if (error.kind === "network") return "Tidak dapat terhubung ke server.";
  if (error.kind === "conflict" && copy?.conflict) return copy.conflict;
  if (error.messages.length > 0) return error.messages.join(" ");
  return copy?.fallback ?? "Gagal menyimpan perubahan.";
}

const TOLL_CONFLICT_COPY =
  "Sudah ada estimasi tol aktif — nonaktifkan dulu sebelum mengaktifkan yang baru.";

export type MovingTruckClassResult =
  | { ok: true; data: AdminMovingTruckClass }
  | { ok: false; error: string };

export type MovingAddonResult =
  | { ok: true; data: AdminMovingAddon }
  | { ok: false; error: string; conflict?: true };

// ─── Truck classes ──────────────────────────────────────────────────────────

/** Every write endpoint's response goes through the same mapper as GET
 *  (verified against moving.controller.ts), so this re-read is technically
 *  redundant — kept anyway for consistency with createStorageUnitTypeAction
 *  and friends, and as a guard if that ever stops being true. */
async function refreshedTruckClass(id: string): Promise<MovingTruckClassResult> {
  const result = await getMovingTruckClass(id);
  if (!result.ok) return { ok: false, error: errorMessage(result.error) };
  return { ok: true, data: result.data };
}

// Truck classes never 409 — see lib/api/moving.ts's header comment — so
// this result type carries no `conflict` flag, unlike the addon actions
// below.
export async function createMovingTruckClassAction(input: MovingTruckClassInput): Promise<MovingTruckClassResult> {
  const result = await createMovingTruckClass(input);
  if (!result.ok) {
    log.warn("Create truck class failed", { kind: result.error.kind });
    return { ok: false, error: errorMessage(result.error, { fallback: "Gagal membuat tipe truk." }) };
  }
  revalidatePath("/moving/truck-classes");
  return { ok: true, data: result.data };
}

export async function updateMovingTruckClassAction(id: string, patch: MovingTruckClassInput): Promise<MovingTruckClassResult> {
  const result = await updateMovingTruckClass(id, patch);
  if (!result.ok) {
    log.warn("Update truck class failed", { id, kind: result.error.kind });
    return { ok: false, error: errorMessage(result.error, { fallback: "Gagal menyimpan tipe truk." }) };
  }
  revalidatePath(`/moving/truck-classes/${id}`);
  revalidatePath("/moving/truck-classes");
  return refreshedTruckClass(id);
}

export async function deleteMovingTruckClassAction(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const result = await deleteMovingTruckClass(id);
  if (!result.ok) {
    log.warn("Delete truck class failed", { id, kind: result.error.kind });
    return { ok: false, error: errorMessage(result.error, { fallback: "Gagal menghapus tipe truk." }) };
  }
  revalidatePath("/moving/truck-classes");
  return { ok: true };
}

// ─── Add-ons ────────────────────────────────────────────────────────────────

async function refreshedAddon(id: string): Promise<MovingAddonResult> {
  const result = await getMovingAddon(id);
  if (!result.ok) return { ok: false, error: errorMessage(result.error) };
  return { ok: true, data: result.data };
}

/** The only mutations in this module that can 409 — activating a second
 *  active `kind: "toll"` row. See createMovingAddon's doc comment. */
export async function createMovingAddonAction(input: MovingAddonInput): Promise<MovingAddonResult> {
  const result = await createMovingAddon(input);
  if (!result.ok) {
    log.warn("Create addon failed", { kind: result.error.kind });
    return {
      ok: false,
      error: errorMessage(result.error, { conflict: TOLL_CONFLICT_COPY, fallback: "Gagal membuat add-on." }),
      ...(result.error.kind === "conflict" ? { conflict: true as const } : {}),
    };
  }
  revalidatePath("/moving/addons");
  return { ok: true, data: result.data };
}

export async function updateMovingAddonAction(id: string, patch: MovingAddonInput): Promise<MovingAddonResult> {
  const result = await updateMovingAddon(id, patch);
  if (!result.ok) {
    log.warn("Update addon failed", { id, kind: result.error.kind });
    return {
      ok: false,
      error: errorMessage(result.error, { conflict: TOLL_CONFLICT_COPY, fallback: "Gagal menyimpan add-on." }),
      ...(result.error.kind === "conflict" ? { conflict: true as const } : {}),
    };
  }
  revalidatePath(`/moving/addons/${id}`);
  revalidatePath("/moving/addons");
  return refreshedAddon(id);
}

export async function deleteMovingAddonAction(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const result = await deleteMovingAddon(id);
  if (!result.ok) {
    log.warn("Delete addon failed", { id, kind: result.error.kind });
    return { ok: false, error: errorMessage(result.error, { fallback: "Gagal menghapus add-on." }) };
  }
  revalidatePath("/moving/addons");
  return { ok: true };
}
