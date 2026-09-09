"use server";

import { revalidatePath } from "next/cache";
import { updateStorageSettings, type AdminStorageSettings, type StorageSettingsInput } from "@/lib/api/storage-settings";
import type { ApiError } from "@/lib/api/errors";
import { createLogger } from "@/lib/logger";

const log = createLogger("storage-settings");

function errorMessage(error: ApiError): string {
  if (error.kind === "network") return "Tidak dapat terhubung ke server.";
  if (error.messages.length > 0) return error.messages.join(" ");
  return "Gagal menyimpan pengaturan.";
}

export type StorageSettingsResult = { ok: true; data: AdminStorageSettings } | { ok: false; error: string };

/** Singleton — no id, no create, no delete. Never 409s: StorageSettingsService
 *  has no business rule that could conflict, just one independent int. */
export async function updateStorageSettingsAction(patch: StorageSettingsInput): Promise<StorageSettingsResult> {
  const result = await updateStorageSettings(patch);
  if (!result.ok) {
    log.warn("Update storage settings failed", { kind: result.error.kind });
    return { ok: false, error: errorMessage(result.error) };
  }
  revalidatePath("/storage/settings");
  return { ok: true, data: result.data };
}
