import "server-only";
import { cache } from "react";
import { serverApi, unwrap } from "@/lib/api/server-client";
import type { ApiResult } from "@/lib/api/errors";

/**
 * "/admin/page-images" isn't in lib/api/schema.d.ts yet — that file is
 * generated from the last deployed spec, and this module ships in the
 * same change as the admin screens that consume it (same situation
 * lib/api/content-blocks.ts's header comment describes for
 * `property_promo`, here for the whole route rather than one field).
 * serverApi()'s client is generic over the schema's known path literals,
 * so calling an unknown one needs an escape hatch: `RawFetch` below is
 * that same client's `GET`/`PATCH` with the path-literal type erased,
 * keeping the real baseUrl/Authorization wiring serverApi() sets up.
 * Every field has been checked against the live API's actual response
 * shape. Drop the casts after `npm run gen:api` against a deployment that
 * has this module — nothing else in this file changes.
 */
type RawResult = { data?: unknown; error?: unknown; response: Response };
type RawFetch = (path: string, init?: Record<string, unknown>) => Promise<RawResult>;

export interface PageImage {
  url: string;
  srcset: string;
  srcsetAvif: string;
  placeholder: string | null;
  alt: string | null;
  width: number;
  height: number;
}

export interface AdminPageImage {
  slotKey: string;
  image: PageImage | null;
  /** Null on every slot except the two with supportsMobileImage: true
   *  (lib/page-images/shared.ts) — and null there too until an admin
   *  uploads one. */
  mobileImage: PageImage | null;
}

/** All 5 slots, in the API's PAGE_IMAGE_SLOTS declared order. cache()d so
 *  a page and any sibling component reading this share one request. */
export const listPageImages = cache(async (): Promise<ApiResult<AdminPageImage[]>> => {
  const api = await serverApi();
  const get = api.GET as unknown as RawFetch;
  const result = await get("/admin/page-images");
  return unwrap<AdminPageImage[]>(result);
});

export interface UpdatePageImageBody {
  mediaAssetId?: string | null;
  mobileMediaAssetId?: string | null;
}

/** A partial body object, not two positional params: page-images-form.tsx
 *  saves both pickers of a slot in one PATCH, and omitting a key here (as
 *  opposed to sending it `null`) is what leaves that picker's stored image
 *  untouched — same tri-state convention content-blocks' update uses. */
export async function updatePageImage(
  slotKey: string,
  body: UpdatePageImageBody,
): Promise<ApiResult<AdminPageImage>> {
  const api = await serverApi();
  const patch = api.PATCH as unknown as RawFetch;
  const result = await patch(`/admin/page-images/${slotKey}`, { body });
  return unwrap<AdminPageImage>(result);
}
