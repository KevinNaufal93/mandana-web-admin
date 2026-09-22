"use server";

import { revalidatePath } from "next/cache";
import { updatePageImage, type AdminPageImage, type UpdatePageImageBody } from "@/lib/api/page-images";
import { findPageImagePageBySlotKey } from "@/lib/page-images/shared";
import type { ApiError } from "@/lib/api/errors";
import { createLogger } from "@/lib/logger";

const log = createLogger("page-images");

function errorMessage(error: ApiError): string {
  if (error.kind === "network") return "Tidak dapat terhubung ke server.";
  if (error.messages.length > 0) return error.messages.join(" ");
  return "Gagal menyimpan perubahan.";
}

export type PageImageResult = { ok: true; data: AdminPageImage } | { ok: false; error: string };

export async function updatePageImageAction(slotKey: string, body: UpdatePageImageBody): Promise<PageImageResult> {
  const result = await updatePageImage(slotKey, body);
  if (!result.ok) {
    log.warn("Update page image failed", { slotKey, kind: result.error.kind });
    return { ok: false, error: errorMessage(result.error) };
  }
  // Which tab to revalidate depends on which page owns this slot key —
  // no-op (rather than guessing a path) if a slot key isn't in the
  // registry, which shouldn't happen since updatePageImage() only
  // succeeds against a key the API already recognizes.
  const page = findPageImagePageBySlotKey(slotKey);
  if (page) revalidatePath(`/content-media/${page.slug}`);
  return { ok: true, data: result.data };
}
