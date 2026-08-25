"use server";

import { uploadMedia, deleteMedia, type UploadedMedia } from "@/lib/api/media";
import type { ApiError } from "@/lib/api/errors";
import { createLogger } from "@/lib/logger";

const log = createLogger("media");

function errorMessage(error: ApiError): string {
  if (error.kind === "network") return "Tidak dapat terhubung ke server.";
  if (error.messages.length > 0) return error.messages.join(" ");
  return "Gagal mengunggah gambar.";
}

export type MediaUploadResult = { ok: true; data: UploadedMedia } | { ok: false; error: string };

// FormData arg — the documented multipart exception to "typed args, not
// FormData" (see uploadPropertyImageAction in app/actions/properties.ts).
export async function uploadMediaAction(formData: FormData): Promise<MediaUploadResult> {
  const result = await uploadMedia(formData);
  if (!result.ok) {
    log.warn("Upload media failed", { kind: result.error.kind });
    return { ok: false, error: errorMessage(result.error) };
  }
  return { ok: true, data: result.data };
}

// No revalidatePath here or below: a freshly uploaded/deleted asset is
// attached to no page. Revalidation happens in whichever category/item
// action persists (or drops) the mediaAssetId.
export async function deleteMediaAction(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const result = await deleteMedia(id);
  if (!result.ok) {
    log.warn("Delete media failed", { id, kind: result.error.kind });
    return { ok: false, error: errorMessage(result.error) };
  }
  return { ok: true };
}
