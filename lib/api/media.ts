import "server-only";
import { verifySession } from "@/lib/auth/dal";
import { parseApiError, type ApiResult } from "@/lib/api/errors";
import { serverApi, unwrap } from "@/lib/api/server-client";

/**
 * Raw fetch: a multipart body's `file` field isn't representable as real
 * FormData in the generated schema's types, so openapi-fetch fights us
 * here no matter what the schema says.
 *
 * POST /admin/media/upload's 201 body is `{data: <raw MediaAsset entity>}`
 * — verified against mandana-api/src/modules/media/{media.controller,
 * media.service}.ts. Critically, this is NOT the same shape as the
 * `image: {url, srcset, alt, width, height}` a category/item response
 * embeds: that convenience shape only exists after MediaService's
 * buildImageDto() runs, which happens when an entity is READ, not on
 * upload. The raw entity's `variants` map holds STORAGE KEYS
 * (`{webp: {800: "media/<id>/webp-800.webp"}, ...}`), not full URLs —
 * turning a key into a URL needs StorageService.buildUrl(), which isn't
 * exposed to this app. There is no renderable URL anywhere in this
 * response. Callers must not build a preview from it (see ImagePicker,
 * which uses a local object URL instead).
 */
export interface UploadedMedia {
  id: string;
  storageKey: string;
  mimeType: string;
  width: number;
  height: number;
  sizeBytes: number;
  alt: string | null;
}

export type MediaPurpose = "hero" | "cover";

/**
 * `formData` is built by the caller (a client component) with `file`
 * (required, JPEG/PNG/WebP, max 20MB), `purpose` (required — determines
 * which responsive widths get generated), and optionally `alt`.
 */
export async function uploadMedia(formData: FormData): Promise<ApiResult<UploadedMedia>> {
  const { accessToken } = await verifySession();
  const baseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "");

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/admin/media/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` }, // no Content-Type — fetch sets the multipart boundary
      body: formData,
      cache: "no-store",
    });
  } catch {
    return { ok: false, error: { kind: "network" } };
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) return { ok: false, error: parseApiError(response.status, body) };
  return { ok: true, data: (body as { data: UploadedMedia }).data };
}

/**
 * Forward-looking, unlike everything else in this file: GET
 * /admin/media/:id currently returns the bare MediaAsset entity — no
 * `image` field — verified against
 * mandana-api/src/modules/media/media.service.ts's findOneOrFail(). Only
 * findAllAdmin()'s list rows run buildImageDto() per row today. This type
 * documents the one-line backend change that would make findOne() do the
 * same (add `image: buildImageDto(asset)` alongside the bare fields) —
 * `image` is typed optional/nullable specifically so callers are forced
 * to handle "not there yet" rather than assume it. The only consumer
 * right now is RichTextEditor's allowImages image-insert flow, which
 * needs a real URL to persist inline (unlike ImagePicker, which only
 * ever needs a local blob: preview — see its own header comment).
 */
export interface MediaAssetDetail {
  id: string;
  image?: {
    url: string;
    srcset: string;
    srcsetAvif: string;
    placeholder: string | null;
    alt: string | null;
    width: number;
    height: number;
  } | null;
}

/** Uses openapi-fetch (unlike upload/delete above) — a plain GET has none
 *  of the multipart-typing problems those raw fetches work around. */
export async function getMediaAsset(id: string): Promise<ApiResult<MediaAssetDetail>> {
  const api = await serverApi();
  const result = await api.GET("/admin/media/{id}", { params: { path: { id } } });
  return unwrap<MediaAssetDetail>(result);
}

/** Deletes a media asset and all its storage variants. 204 on success. */
export async function deleteMedia(id: string): Promise<ApiResult<void>> {
  const { accessToken } = await verifySession();
  const baseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "");

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/admin/media/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
  } catch {
    return { ok: false, error: { kind: "network" } };
  }

  if (response.status === 204) return { ok: true, data: undefined };
  const body = await response.json().catch(() => null);
  return { ok: false, error: parseApiError(response.status, body) };
}
