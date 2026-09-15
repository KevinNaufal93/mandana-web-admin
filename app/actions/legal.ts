"use server";

import { revalidatePath } from "next/cache";
import {
  updateLegalPage,
  type AdminLegalPage,
  type LegalPageInput,
  type LegalPageKey,
} from "@/lib/api/legal";
import type { ApiError } from "@/lib/api/errors";
import { createLogger } from "@/lib/logger";

const log = createLogger("legal");

function errorMessage(error: ApiError): string {
  if (error.kind === "network") return "Tidak dapat terhubung ke server.";
  if (error.messages.length > 0) return error.messages.join(" ");
  return "Gagal menyimpan halaman.";
}

export type LegalPageResult =
  | { ok: true; data: AdminLegalPage }
  | { ok: false; error: string };

export async function updateLegalPageAction(pageKey: LegalPageKey, patch: LegalPageInput): Promise<LegalPageResult> {
  const result = await updateLegalPage(pageKey, patch);
  if (!result.ok) {
    log.warn("Update legal page failed", { pageKey, kind: result.error.kind });
    return { ok: false, error: errorMessage(result.error) };
  }
  revalidatePath("/seo/legal");
  revalidatePath(`/seo/legal/${pageKey}`);
  return { ok: true, data: result.data };
}
