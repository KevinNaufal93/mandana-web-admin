"use server";

import { revalidatePath } from "next/cache";
import { updatePageImage, type AdminPageImage } from "@/lib/api/page-images";
import type { ApiError } from "@/lib/api/errors";
import { createLogger } from "@/lib/logger";

const log = createLogger("page-images");

function errorMessage(error: ApiError): string {
  if (error.kind === "network") return "Tidak dapat terhubung ke server.";
  if (error.messages.length > 0) return error.messages.join(" ");
  return "Gagal menyimpan perubahan.";
}

export type PageImageResult = { ok: true; data: AdminPageImage } | { ok: false; error: string };

export async function updatePageImageAction(slotKey: string, mediaAssetId: string | null): Promise<PageImageResult> {
  const result = await updatePageImage(slotKey, mediaAssetId);
  if (!result.ok) {
    log.warn("Update page image failed", { slotKey, kind: result.error.kind });
    return { ok: false, error: errorMessage(result.error) };
  }
  revalidatePath("/content-media/tentang-kami");
  return { ok: true, data: result.data };
}
