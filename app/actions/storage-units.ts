"use server";

import { revalidatePath } from "next/cache";
import {
  getStorageUnit,
  createStorageUnit,
  updateStorageUnit,
  deleteStorageUnit,
  bulkCreateStorageUnits,
  type AdminStorageUnit,
  type StorageUnitInput,
  type StorageUnitsBulkInput,
} from "@/lib/api/storage-units";
import type { ApiError } from "@/lib/api/errors";
import { createLogger } from "@/lib/logger";

const log = createLogger("storage-units");

function errorMessage(error: ApiError, copy?: { conflict?: string; fallback?: string }): string {
  if (error.kind === "network") return "Tidak dapat terhubung ke server.";
  if (error.kind === "conflict" && copy?.conflict) return copy.conflict;
  if (error.messages.length > 0) return error.messages.join(" ");
  return copy?.fallback ?? "Gagal menyimpan perubahan.";
}

export type StorageUnitResult = { ok: true; data: AdminStorageUnit } | { ok: false; error: string; conflict?: true };

async function refreshedUnit(id: string): Promise<StorageUnitResult> {
  const result = await getStorageUnit(id);
  if (!result.ok) return { ok: false, error: errorMessage(result.error) };
  return { ok: true, data: result.data };
}

const DUPLICATE_CODE_COPY = "Kode ini sudah dipakai unit lain di fasilitas yang sama.";

export async function createStorageUnitAction(input: StorageUnitInput): Promise<StorageUnitResult> {
  const result = await createStorageUnit(input);
  if (!result.ok) {
    log.warn("Create storage unit failed", { kind: result.error.kind });
    return {
      ok: false,
      error: errorMessage(result.error, { conflict: DUPLICATE_CODE_COPY, fallback: "Gagal membuat unit." }),
      ...(result.error.kind === "conflict" ? { conflict: true as const } : {}),
    };
  }
  revalidatePath("/storage/units");
  revalidatePath("/storage");
  return { ok: true, data: result.data };
}

export async function updateStorageUnitAction(id: string, patch: StorageUnitInput): Promise<StorageUnitResult> {
  const result = await updateStorageUnit(id, patch);
  if (!result.ok) {
    log.warn("Update storage unit failed", { id, kind: result.error.kind });
    return {
      ok: false,
      error: errorMessage(result.error, { conflict: DUPLICATE_CODE_COPY, fallback: "Gagal menyimpan unit." }),
      ...(result.error.kind === "conflict" ? { conflict: true as const } : {}),
    };
  }
  revalidatePath(`/storage/units/${id}`);
  revalidatePath("/storage/units");
  revalidatePath("/storage");
  return refreshedUnit(id);
}

export async function deleteStorageUnitAction(id: string): Promise<{ ok: true } | { ok: false; error: string; conflict?: true }> {
  const result = await deleteStorageUnit(id);
  if (!result.ok) {
    log.warn("Delete storage unit failed", { id, kind: result.error.kind });
    return {
      ok: false,
      error: errorMessage(result.error, {
        conflict: "Unit ini sedang ditempati pada pemesanan aktif dan tidak dapat dihapus.",
        fallback: "Gagal menghapus unit.",
      }),
      ...(result.error.kind === "conflict" ? { conflict: true as const } : {}),
    };
  }
  revalidatePath("/storage/units");
  revalidatePath("/storage");
  return { ok: true };
}

export interface StorageUnitBulkDeleteFailure {
  id: string;
  error: string;
}

export interface StorageUnitsBulkDeleteResult {
  deletedCount: number;
  failed: StorageUnitBulkDeleteFailure[];
}

/**
 * There is no bulk-delete endpoint on the backend — only
 * DELETE /admin/storage/units/{id} (single) and POST .../units/bulk
 * (bulk CREATE, unrelated). This loops the single-delete call instead,
 * so it is NOT atomic: an occupied unit inside the selection 409s on its
 * own turn while every other selected unit still gets deleted. Callers
 * must render `failed` explicitly rather than treating this as an
 * all-or-nothing action.
 */
export async function bulkDeleteStorageUnitsAction(ids: string[]): Promise<StorageUnitsBulkDeleteResult> {
  const outcomes = await Promise.all(
    ids.map(async (id) => {
      const result = await deleteStorageUnit(id);
      if (result.ok) return { id, ok: true as const };
      log.warn("Bulk delete storage unit failed", { id, kind: result.error.kind });
      return {
        id,
        ok: false as const,
        error: errorMessage(result.error, {
          conflict: "Unit ini sedang ditempati pada pemesanan aktif.",
          fallback: "Gagal menghapus unit.",
        }),
      };
    }),
  );

  const failed = outcomes
    .filter((o): o is { id: string; ok: false; error: string } => !o.ok)
    .map(({ id, error }) => ({ id, error }));
  const deletedCount = outcomes.length - failed.length;

  if (deletedCount > 0) {
    revalidatePath("/storage/units");
    revalidatePath("/storage");
  }

  return { deletedCount, failed };
}

export type StorageUnitsBulkResult =
  | { ok: true; data: AdminStorageUnit[] }
  | { ok: false; error: string; conflict?: true };

export async function bulkCreateStorageUnitsAction(input: StorageUnitsBulkInput): Promise<StorageUnitsBulkResult> {
  const result = await bulkCreateStorageUnits(input);
  if (!result.ok) {
    log.warn("Bulk create storage units failed", { kind: result.error.kind });
    return {
      ok: false,
      error: errorMessage(result.error, {
        conflict: "Salah satu kode hasil penomoran otomatis sudah dipakai. Coba awalan kode lain.",
        fallback: "Gagal menambahkan unit secara massal.",
      }),
      ...(result.error.kind === "conflict" ? { conflict: true as const } : {}),
    };
  }
  revalidatePath("/storage/units");
  revalidatePath("/storage");
  return { ok: true, data: result.data };
}
