"use server";

import { revalidatePath } from "next/cache";
import {
  getStorageUnitType,
  createStorageUnitType,
  updateStorageUnitType,
  deleteStorageUnitType,
  getStorageFacility,
  createStorageFacility,
  updateStorageFacility,
  deleteStorageFacility,
  type AdminStorageUnitType,
  type AdminStorageFacility,
  type StorageUnitTypeInput,
  type StorageFacilityInput,
} from "@/lib/api/storage";
import type { ApiError } from "@/lib/api/errors";
import { createLogger } from "@/lib/logger";

const log = createLogger("storage");

/** Copy of app/actions/event-support.ts's errorMessage() — see that
 *  file's header comment for why `conflict` gets its own copy per call
 *  site rather than the server's raw English text. */
function errorMessage(error: ApiError, copy?: { conflict?: string; fallback?: string }): string {
  if (error.kind === "network") return "Tidak dapat terhubung ke server.";
  if (error.kind === "conflict" && copy?.conflict) return copy.conflict;
  if (error.messages.length > 0) return error.messages.join(" ");
  return copy?.fallback ?? "Gagal menyimpan perubahan.";
}

const DUPLICATE_SLUG_COPY = "Slug sudah dipakai. Gunakan slug lain atau kosongkan agar dibuat otomatis.";

export type StorageUnitTypeResult =
  | { ok: true; data: AdminStorageUnitType }
  | { ok: false; error: string; conflict?: true };

export type StorageFacilityResult =
  | { ok: true; data: AdminStorageFacility }
  | { ok: false; error: string; conflict?: true };

// ─── Unit types ─────────────────────────────────────────────────────────────

/** Every write endpoint's body shape differs slightly from the canonical
 *  read (flat dimensions vs. nested, see lib/api/storage.ts), so — same
 *  rule as event-support's refreshedCategory() — every mutation re-reads
 *  through the one path that's already correct. */
async function refreshedUnitType(id: string): Promise<StorageUnitTypeResult> {
  const result = await getStorageUnitType(id);
  if (!result.ok) return { ok: false, error: errorMessage(result.error) };
  return { ok: true, data: result.data };
}

export async function createStorageUnitTypeAction(input: StorageUnitTypeInput): Promise<StorageUnitTypeResult> {
  const result = await createStorageUnitType(input);
  if (!result.ok) {
    log.warn("Create storage unit type failed", { kind: result.error.kind });
    return {
      ok: false,
      error: errorMessage(result.error, { conflict: DUPLICATE_SLUG_COPY, fallback: "Gagal membuat tipe unit." }),
      ...(result.error.kind === "conflict" ? { conflict: true as const } : {}),
    };
  }
  revalidatePath("/storage/unit-types");
  return { ok: true, data: result.data };
}

export async function updateStorageUnitTypeAction(id: string, patch: StorageUnitTypeInput): Promise<StorageUnitTypeResult> {
  const result = await updateStorageUnitType(id, patch);
  if (!result.ok) {
    log.warn("Update storage unit type failed", { id, kind: result.error.kind });
    return {
      ok: false,
      error: errorMessage(result.error, { conflict: DUPLICATE_SLUG_COPY, fallback: "Gagal menyimpan tipe unit." }),
      ...(result.error.kind === "conflict" ? { conflict: true as const } : {}),
    };
  }
  revalidatePath(`/storage/unit-types/${id}`);
  revalidatePath("/storage/unit-types");
  return refreshedUnitType(id);
}

export async function deleteStorageUnitTypeAction(id: string): Promise<{ ok: true } | { ok: false; error: string; conflict?: true }> {
  const result = await deleteStorageUnitType(id);
  if (!result.ok) {
    log.warn("Delete storage unit type failed", { id, kind: result.error.kind });
    return {
      ok: false,
      error: errorMessage(result.error, {
        conflict: "Tipe unit ini masih dipakai pada inventaris. Hapus inventarisnya terlebih dahulu.",
        fallback: "Gagal menghapus tipe unit.",
      }),
      ...(result.error.kind === "conflict" ? { conflict: true as const } : {}),
    };
  }
  revalidatePath("/storage/unit-types");
  return { ok: true };
}

// ─── Facilities ─────────────────────────────────────────────────────────────

async function refreshedFacility(id: string): Promise<StorageFacilityResult> {
  const result = await getStorageFacility(id);
  if (!result.ok) return { ok: false, error: errorMessage(result.error) };
  return { ok: true, data: result.data };
}

export async function createStorageFacilityAction(input: StorageFacilityInput): Promise<StorageFacilityResult> {
  const result = await createStorageFacility(input);
  if (!result.ok) {
    log.warn("Create storage facility failed", { kind: result.error.kind });
    return {
      ok: false,
      error: errorMessage(result.error, { conflict: DUPLICATE_SLUG_COPY, fallback: "Gagal membuat fasilitas." }),
      ...(result.error.kind === "conflict" ? { conflict: true as const } : {}),
    };
  }
  revalidatePath("/storage/facilities");
  revalidatePath("/storage");
  return { ok: true, data: result.data };
}

export async function updateStorageFacilityAction(id: string, patch: StorageFacilityInput): Promise<StorageFacilityResult> {
  const result = await updateStorageFacility(id, patch);
  if (!result.ok) {
    log.warn("Update storage facility failed", { id, kind: result.error.kind });
    return {
      ok: false,
      error: errorMessage(result.error, { conflict: DUPLICATE_SLUG_COPY, fallback: "Gagal menyimpan fasilitas." }),
      ...(result.error.kind === "conflict" ? { conflict: true as const } : {}),
    };
  }
  revalidatePath(`/storage/facilities/${id}`);
  revalidatePath("/storage/facilities");
  revalidatePath("/storage");
  return refreshedFacility(id);
}

export async function deleteStorageFacilityAction(id: string): Promise<{ ok: true } | { ok: false; error: string; conflict?: true }> {
  const result = await deleteStorageFacility(id);
  if (!result.ok) {
    log.warn("Delete storage facility failed", { id, kind: result.error.kind });
    return {
      ok: false,
      error: errorMessage(result.error, {
        conflict: "Fasilitas ini masih memiliki inventaris atau unit. Hapus itu terlebih dahulu.",
        fallback: "Gagal menghapus fasilitas.",
      }),
      ...(result.error.kind === "conflict" ? { conflict: true as const } : {}),
    };
  }
  revalidatePath("/storage/facilities");
  revalidatePath("/storage");
  return { ok: true };
}
