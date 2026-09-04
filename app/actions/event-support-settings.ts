"use server";

import { revalidatePath } from "next/cache";
import {
  updateEventSupportSettings,
  type AdminEventSupportSettings,
  type EventSupportSettingsInput,
} from "@/lib/api/event-support-settings";
import type { ApiError } from "@/lib/api/errors";
import { createLogger } from "@/lib/logger";

const log = createLogger("event-support-settings");

function errorMessage(error: ApiError): string {
  if (error.kind === "network") return "Tidak dapat terhubung ke server.";
  if (error.messages.length > 0) return error.messages.join(" ");
  return "Gagal menyimpan pengaturan.";
}

export type EventSupportSettingsResult =
  | { ok: true; data: AdminEventSupportSettings }
  | { ok: false; error: string };

/** Singleton — no id, no create, no delete. */
export async function updateEventSupportSettingsAction(
  patch: EventSupportSettingsInput,
): Promise<EventSupportSettingsResult> {
  const result = await updateEventSupportSettings(patch);
  if (!result.ok) {
    log.warn("Update event-support settings failed", { kind: result.error.kind });
    return { ok: false, error: errorMessage(result.error) };
  }
  revalidatePath("/event-support/settings");
  return { ok: true, data: result.data };
}
