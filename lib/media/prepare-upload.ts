import { uploadMediaAction, type MediaUploadResult } from "@/app/actions/media";

/**
 * Why this exists: every upload in this app goes browser → Server Action
 * (this Next app, hosted on Amplify) → API. The API itself accepts up to
 * 20 MB, but the hosting layer in front of the Server Action rejects a
 * request body that large before the action code ever runs. That surfaces
 * as a *rejected* action call, not an `{ ok: false }` result — and a
 * rejection inside startTransition is re-thrown into the nearest
 * error.tsx, blanking the whole page (seen on Content Media Management
 * after uploading a ~20 MB hero photo).
 *
 * Two layers of defense, both client-side:
 *  1. shrinkImageForUpload() downscales anything over MAX_UPLOAD_BYTES
 *     before it's sent. No quality is lost in practice: the API's largest
 *     generated variant is ≤1920px wide, so a 2560px source is still more
 *     than it uses.
 *  2. uploadMediaSafe() turns a rejected action call into a normal
 *     `{ ok: false, error }`, so any remaining failure (timeout, dropped
 *     connection) shows inline instead of crashing the page.
 *
 * Pure browser code (canvas/createImageBitmap) — call only from client
 * components/hooks.
 */

/** Comfortably under the hosting layer's request-body cap (~6 MB, less
 *  multipart/encoding overhead).
 *
 *  This is also the "maksimal 4 MB" every image hint shows (the forms,
 *  lib/content-blocks/types.ts, lib/page-images/shared.ts — grep
 *  "maksimal 4") — change them together. It is deliberately NOT a limit: a bigger file
 *  (the API itself takes up to 20 MB) is still accepted and simply shrunk
 *  below this before sending. The hints only advise 4 MB; they don't
 *  advertise, or enforce, anything higher. */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

/** Largest edge first, then a smaller fallback if the first pass is still
 *  over the cap (e.g. a very noisy photo). */
const RESIZE_STEPS = [
  { maxEdge: 2560, quality: 0.85 },
  { maxEdge: 1920, quality: 0.8 },
];

export const UPLOAD_TOO_LARGE_COPY =
  "Ukuran gambar terlalu besar untuk diunggah. Perkecil gambar (maksimal 4 MB) lalu coba lagi.";

const UPLOAD_FAILED_COPY =
  "Gagal mengunggah gambar — koneksi terputus atau file terlalu besar. Coba lagi dengan gambar yang lebih kecil.";

/**
 * Returns `file` untouched when it's already small enough; otherwise a
 * downscaled re-encode. PNG is re-encoded as WebP (keeps transparency,
 * far smaller); JPEG and WebP keep their own type. Throws with
 * UPLOAD_TOO_LARGE_COPY if nothing gets it under the cap.
 */
export async function shrinkImageForUpload(file: File): Promise<File> {
  if (file.size <= MAX_UPLOAD_BYTES) return file;

  const outputType = file.type === "image/jpeg" ? "image/jpeg" : "image/webp";
  const outputName = outputType === file.type ? file.name : file.name.replace(/\.[^.]+$/, "") + ".webp";

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error(UPLOAD_TOO_LARGE_COPY);
  }

  try {
    for (const { maxEdge, quality } of RESIZE_STEPS) {
      const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) break;
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, outputType, quality));
      if (blob && blob.size <= MAX_UPLOAD_BYTES) {
        return new File([blob], outputName, { type: outputType });
      }
    }
  } finally {
    bitmap.close();
  }

  throw new Error(UPLOAD_TOO_LARGE_COPY);
}

/**
 * Drop-in replacement for calling uploadMediaAction() directly from the
 * client: shrinks the form's `file` entry first, and never rejects.
 */
export async function uploadMediaSafe(formData: FormData): Promise<MediaUploadResult> {
  const file = formData.get("file");
  if (file instanceof File) {
    try {
      formData.set("file", await shrinkImageForUpload(file));
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : UPLOAD_TOO_LARGE_COPY };
    }
  }

  try {
    return await uploadMediaAction(formData);
  } catch {
    return { ok: false, error: UPLOAD_FAILED_COPY };
  }
}
