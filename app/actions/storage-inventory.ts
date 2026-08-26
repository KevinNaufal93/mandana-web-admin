"use server";

import { revalidatePath } from "next/cache";
import {
  getStorageInventory,
  createStorageInventory,
  updateStorageInventory,
  deleteStorageInventory,
  type AdminStorageInventory,
  type StorageInventoryInput,
} from "@/lib/api/storage-inventory";
import type { ApiError } from "@/lib/api/errors";
import { createLogger } from "@/lib/logger";

const log = createLogger("storage-inventory");

function errorMessage(error: ApiError, copy?: { conflict?: string; fallback?: string }): string {
  if (error.kind === "network") return "Tidak dapat terhubung ke server.";
  if (error.kind === "conflict" && copy?.conflict) return copy.conflict;
  if (error.messages.length > 0) return error.messages.join(" ");
  return copy?.fallback ?? "Gagal menyimpan perubahan.";
}

export type StorageInventoryResult =
  | { ok: true; data: AdminStorageInventory }
  | { ok: false; error: string; conflict?: true };

async function refreshedInventory(id: string): Promise<StorageInventoryResult> {
  const result = await getStorageInventory(id);
  if (!result.ok) return { ok: false, error: errorMessage(result.error) };
  return { ok: true, data: result.data };
}

export async function createStorageInventoryAction(input: StorageInventoryInput): Promise<StorageInventoryResult> {
  const result = await createStorageInventory(input);
  if (!result.ok) {
    log.warn("Create storage inventory failed", { kind: result.error.kind });
    return {
      ok: false,
      error: errorMessage(result.error, {
        conflict: "Kombinasi fasilitas dan tipe unit ini sudah ada di inventaris.",
        fallback: "Gagal membuat inventaris.",
      }),
      ...(result.error.kind === "conflict" ? { conflict: true as const } : {}),
    };
  }
  revalidatePath("/storage/inventory");
  return { ok: true, data: result.data };
}

export async function updateStorageInventoryAction(id: string, patch: StorageInventoryInput): Promise<StorageInventoryResult> {
  const result = await updateStorageInventory(id, patch);
  if (!result.ok) {
    log.warn("Update storage inventory failed", { id, kind: result.error.kind });
    return {
      ok: false,
      error: errorMessage(result.error, {
        conflict: "Kombinasi fasilitas dan tipe unit ini sudah ada di inventaris.",
        fallback: "Gagal menyimpan inventaris.",
      }),
      ...(result.error.kind === "conflict" ? { conflict: true as const } : {}),
    };
  }
  revalidatePath(`/storage/inventory/${id}`);
  revalidatePath("/storage/inventory");
  return refreshedInventory(id);
}

export async function deleteStorageInventoryAction(id: string): Promise<{ ok: true } | { ok: false; error: string; conflict?: true }> {
  const result = await deleteStorageInventory(id);
  if (!result.ok) {
    log.warn("Delete storage inventory failed", { id, kind: result.error.kind });
    return {
      ok: false,
      error: errorMessage(result.error, { fallback: "Gagal menghapus inventaris." }),
      ...(result.error.kind === "conflict" ? { conflict: true as const } : {}),
    };
  }
  revalidatePath("/storage/inventory");
  return { ok: true };
}
