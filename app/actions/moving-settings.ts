"use server";

import { revalidatePath } from "next/cache";
import { updateMovingSettings, type AdminMovingSettings, type MovingSettingsInput } from "@/lib/api/moving-settings";
import type { ApiError } from "@/lib/api/errors";
import { createLogger } from "@/lib/logger";

const log = createLogger("moving-settings");

function errorMessage(error: ApiError): string {
  if (error.kind === "network") return "Tidak dapat terhubung ke server.";
  if (error.messages.length > 0) return error.messages.join(" ");
  return "Gagal menyimpan pengaturan.";
}

export type MovingSettingsResult = { ok: true; data: AdminMovingSettings } | { ok: false; error: string };

/** Singleton — no id, no create, no delete. Never 409s: MovingSettingsService
 *  has no business rule that could conflict, just three independent ints. */
export async function updateMovingSettingsAction(patch: MovingSettingsInput): Promise<MovingSettingsResult> {
  const result = await updateMovingSettings(patch);
  if (!result.ok) {
    log.warn("Update moving settings failed", { kind: result.error.kind });
    return { ok: false, error: errorMessage(result.error) };
  }
  revalidatePath("/moving/settings");
  return { ok: true, data: result.data };
}
