import "server-only";
import { cache } from "react";
import { serverApi, unwrap } from "@/lib/api/server-client";
import type { ApiResult } from "@/lib/api/errors";
import type { components } from "@/lib/api/schema";
import type { ListingType } from "@/lib/properties/query";

/**
 * Same rationale as lib/api/storage.ts's header comment: response types
 * below are hand-written rather than aliased to components["schemas"][...].
 * Here that's not even a choice — every content-blocks admin response is
 * `content?: never` in the generated schema (no @ApiOkResponse DTO, same
 * situation as media upload), so there is nothing to alias to on the read
 * side. The write DTOs (CreateContentBlockDto/UpdateContentBlockDto) do
 * have real schemas and back the request body casts below. Every field
 * has been checked against the live deployed spec
 * (https://d3n6d6boq936jc.cloudfront.net/docs-json) and matches
 * docs/content-blocks-admin-integration.md exactly.
 */

/** The API's `type` enum. `lib/api/schema.d.ts` (generated from an older
 *  spec) still only knows "hero" | "service_card" — see the cast in
 *  listContentBlocks() below, which is the one place that gap bites. */
export type ContentBlockType = "hero" | "service_card" | "property_promo";

/** Restricts a `property_promo` card to specific listing types. `null`
 *  (or an empty array, which this module always normalizes to `null`
 *  before sending) means "show on every listing type" — doc §4b.
 *  Meaningless on `hero`/`service_card`: sending a non-empty array on
 *  either is a 400. */
export type ListingTypeScope = ListingType[] | null;

export interface ContentBlockImage {
  url: string;
  srcset: string;
  /** "" for cover-purpose images (service cards, promo cards) — AVIF is
   *  only generated for hero-purpose uploads. Render an avif <source>
   *  only when non-empty. */
  srcsetAvif: string;
  /** Small base64 data: URI for blur-up. Can be null on an asset uploaded
   *  before this field existed. */
  placeholder: string | null;
  /** Set once at upload time on the media asset itself — there is no
   *  separate per-content-block alt field. */
  alt: string | null;
  width: number;
  height: number;
}

export interface AdminContentBlock {
  id: string;
  /** "hero" | "service_card" | "property_promo" today — kept as `string`
   *  here so an unknown future type from the API degrades to a generic
   *  row instead of a type error; see lib/content-blocks/types.ts's
   *  findTypeByValue(). */
  type: string;
  title: string;
  subtitle: string | null;
  ctaText: string | null;
  link: string | null;
  mediaAssetId: string | null;
  /** null only for a service/promo card with no image attached yet — a
   *  hero always has one (the hero-requires-image rule, doc §4). */
  image: ContentBlockImage | null;
  sortOrder: number;
  isActive: boolean;
  /** See ContentBlockTypeDef.supportsImageOnly's doc comment — as of this
   *  admin module's build the deployed API documents this as unused/
   *  always-`false` for `type: "hero"` (docs/content-blocks-admin-
   *  integration.md §2); the admin form still lets it be set on a hero so
   *  the toggle is ready once the backend/public site honor it there. */
  imageOnly: boolean;
  /** `property_promo` only — `null` on hero/service_card rows (doc §4b). */
  listingTypeScope: ListingTypeScope;
  createdAt: string;
  updatedAt: string;
}

export interface ContentBlockInput {
  type?: ContentBlockType;
  title?: string;
  subtitle?: string;
  ctaText?: string;
  link?: string;
  /** Explicit `null` clears a service/promo card's image (rejected 400 on
   *  a hero — doc §4). Omit the key entirely to leave the current image
   *  untouched — see the plan's note on <ImagePicker> value semantics. */
  mediaAssetId?: string | null;
  sortOrder?: number;
  isActive?: boolean;
  imageOnly?: boolean;
  /** Only send on a `property_promo` row. `null` clears an existing
   *  scope (send it explicitly — omitting the key leaves the current
   *  scope untouched, same convention as `mediaAssetId`). Setting a
   *  non-empty array on any other type is a 400 (doc §4b). */
  listingTypeScope?: ListingTypeScope;
}

/**
 * Omit `type` to list every block together, ordered by type then
 * sortOrder then createdAt (doc §3). Always returns both active and
 * inactive rows — there is no isActive filter on this endpoint.
 */
export async function listContentBlocks(type?: ContentBlockType): Promise<ApiResult<AdminContentBlock[]>> {
  const api = await serverApi();
  const result = await api.GET("/admin/content-blocks", {
    // The deployed spec accepts `property_promo`; lib/api/schema.d.ts
    // predates it (see the file header). Drop this cast after re-running
    // `npm run gen:api` against a live API — nothing else in this file
    // changes.
    params: { query: (type ? { type } : {}) as { type?: "hero" | "service_card" } },
  });
  return unwrap<AdminContentBlock[]>(result);
}

/**
 * No GET /admin/content-blocks/:id exists on this API — the resource is a
 * handful of rows per type, always listed in full (doc §3), so a detail
 * page derives its row from the same list call instead of a dedicated
 * endpoint. cache()d so generateMetadata() and the page share one
 * request, same as every other module's single-item getter.
 */
export const getContentBlock = cache(async (id: string): Promise<ApiResult<AdminContentBlock>> => {
  const result = await listContentBlocks();
  if (!result.ok) return result;
  const block = result.data.find((b) => b.id === id);
  return block ? { ok: true, data: block } : { ok: false, error: { kind: "notFound", messages: [] } };
});

export async function createContentBlock(input: ContentBlockInput): Promise<ApiResult<AdminContentBlock>> {
  const api = await serverApi();
  const result = await api.POST("/admin/content-blocks", {
    body: input as unknown as components["schemas"]["CreateContentBlockDto"],
  });
  return unwrap<AdminContentBlock>(result);
}

export async function updateContentBlock(id: string, patch: ContentBlockInput): Promise<ApiResult<AdminContentBlock>> {
  const api = await serverApi();
  const result = await api.PATCH("/admin/content-blocks/{id}", {
    params: { path: { id } },
    body: patch as unknown as components["schemas"]["UpdateContentBlockDto"],
  });
  return unwrap<AdminContentBlock>(result);
}

/** Removes the content-block row only — the underlying media asset is
 *  untouched and stays in the library (doc §7). */
export async function deleteContentBlock(id: string): Promise<ApiResult<void>> {
  const api = await serverApi();
  const result = await api.DELETE("/admin/content-blocks/{id}", { params: { path: { id } } });
  return unwrap<void>(result);
}
