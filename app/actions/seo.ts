"use server";

import { revalidatePath } from "next/cache";
import {
  updateSeoSettings,
  updatePageSeo,
  type AdminSeoSettings,
  type AdminPageSeo,
  type SeoSettingsInput,
  type PageSeoInput,
  type SeoPageKey,
} from "@/lib/api/seo";
import type { ApiError } from "@/lib/api/errors";
import { createLogger } from "@/lib/logger";

const log = createLogger("seo");

function errorMessage(error: ApiError): string {
  if (error.kind === "network") return "Tidak dapat terhubung ke server.";
  if (error.messages.length > 0) return error.messages.join(" ");
  return "Gagal menyimpan pengaturan.";
}

export type SeoSettingsResult =
  | { ok: true; data: AdminSeoSettings }
  | { ok: false; error: string };

/** Singleton — no id, no create, no delete. Same shape as
 *  updateMovingSettingsAction. */
export async function updateSeoSettingsAction(patch: SeoSettingsInput): Promise<SeoSettingsResult> {
  const result = await updateSeoSettings(patch);
  if (!result.ok) {
    log.warn("Update SEO settings failed", { kind: result.error.kind });
    return { ok: false, error: errorMessage(result.error) };
  }
  revalidatePath("/seo/settings");
  return { ok: true, data: result.data };
}

export type PageSeoResult =
  | { ok: true; data: AdminPageSeo }
  | { ok: false; error: string };

/** The one real error path here: a 400 when noIndex:true is sent for
 *  "home" — see SEO_PAGE_META.canHide in lib/api/seo.ts. The form itself
 *  never offers that switch for home, so reaching this from the UI would
 *  mean the two definitions drifted; still surfaced as a normal form
 *  error rather than assumed impossible. */
export async function updatePageSeoAction(pageKey: SeoPageKey, patch: PageSeoInput): Promise<PageSeoResult> {
  const result = await updatePageSeo(pageKey, patch);
  if (!result.ok) {
    log.warn("Update page SEO failed", { pageKey, kind: result.error.kind });
    return { ok: false, error: errorMessage(result.error) };
  }
  revalidatePath("/seo/pages");
  revalidatePath(`/seo/pages/${pageKey}`);
  return { ok: true, data: result.data };
}
