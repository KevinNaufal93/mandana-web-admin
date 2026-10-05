"use server";

import { revalidatePath } from "next/cache";
import {
  updatePropertySettings,
  type AdminPropertySettings,
  type PropertySettingsInput,
} from "@/lib/api/property-settings";
import type { ApiError } from "@/lib/api/errors";
import { createLogger } from "@/lib/logger";

const log = createLogger("property-settings");

function errorMessage(error: ApiError): string {
  if (error.kind === "network") return "Tidak dapat terhubung ke server.";
  if (error.messages.length > 0) return error.messages.join(" ");
  return "Gagal menyimpan pengaturan.";
}

export type PropertySettingsResult =
  | { ok: true; data: AdminPropertySettings }
  | { ok: false; error: string };

/** Singleton — no id, no create, no delete. */
export async function updatePropertySettingsAction(patch: PropertySettingsInput): Promise<PropertySettingsResult> {
  const result = await updatePropertySettings(patch);
  if (!result.ok) {
    log.warn("Update property settings failed", { kind: result.error.kind });
    return { ok: false, error: errorMessage(result.error) };
  }
  revalidatePath("/properties/settings");
  return { ok: true, data: result.data };
}
