import "server-only";
import { cache } from "react";
import { serverApi, unwrap } from "@/lib/api/server-client";
import type { ApiResult } from "@/lib/api/errors";
import type { components } from "@/lib/api/schema";
import type { MovingCatalogQuery, MovingAddonKind, MovingAddonPricingModel } from "@/lib/moving/query";

/**
 * Same rationale as lib/api/storage.ts's header comment: the admin moving
 * routes carry real @ApiOkResponse DTOs (TruckClassDto, MovingAddonDto, ...)
 * so openapi-fetch gives real request AND response typing. Response types
 * below are still hand-written rather than aliased straight to
 * components["schemas"][...], for the same decoupling reason — and because
 * MovingAddonDto's `kind`/`pricingModel` are widened to plain `string` on
 * the generated read type; narrowed back to real unions here.
 *
 * Both truck-classes and addons are unpaginated — query is just
 * `{ isActive? }`, response is a bare array. Neither entity can 409 on
 * delete: TruckClassesService.remove()/MovingAddonsService.remove() call
 * repo.remove() unconditionally — leads snapshot truckSlug/truckName and
 * addon lines as plain strings with no FK back to the catalog, so nothing
 * ever blocks a delete. The one 409 in this whole module is the
 * single-active-toll rule on addon create/update — see below.
 */

export interface MovingImage {
  url: string;
  srcset: string;
  /** Empty when this asset has no AVIF variants — only hero uploads generate AVIF. */
  srcsetAvif: string;
  /** ~20px WebP data: URI for an instant blurred paint; null until backfilled for pre-existing assets. */
  placeholder: string | null;
  alt: string | null;
  width: number;
  height: number;
}

/** Read shape nests dimensions; the write DTOs (below) take them flat —
 *  see CreateTruckClassDto/UpdateTruckClassDto in schema.d.ts. Forms must
 *  unpack on load and flatten on submit, same as storage unit types. */
export interface MovingDimensions {
  lengthCm: number;
  widthCm: number;
  heightCm: number;
}

export interface AdminMovingTruckClass {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  descriptionText: string | null;
  capacityKg: number | null;
  volumeM3: number | null;
  dimensions: MovingDimensions | null;
  helperCount: number | null;
  /** Rupiah, integer */
  baseFare: number;
  /** Rupiah per km, integer */
  perKmFare: number;
  /** Falls back to settings' defaultIncludedKm when unset. */
  includedKm: number | null;
  /** Rupiah floor for the total fare. */
  minFare: number | null;
  /** Raw id of the attached asset — what the edit form's <ImagePicker>
   *  binds to. `image` is the rendered projection of the same row. */
  mediaAssetId: string | null;
  image: MovingImage | null;
  isActive: boolean;
  sortOrder: number;
}

export interface AdminMovingAddon {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  descriptionText: string | null;
  kind: MovingAddonKind;
  pricingModel: MovingAddonPricingModel;
  /** Rupiah, integer. Used by `flat`/`per_unit`; ignored by `percent`. */
  unitPrice: number;
  /** Basis points (20 = 0.20%). Used only by `percent`. */
  percentBps: number | null;
  minCharge: number | null;
  maxCharge: number | null;
  unitLabel: string | null;
  minQty: number;
  maxQty: number;
  doublesOnRoundTrip: boolean;
  mediaAssetId: string | null;
  image: MovingImage | null;
  isActive: boolean;
  sortOrder: number;
}

// ─── Truck classes ──────────────────────────────────────────────────────────

export async function listMovingTruckClasses(query: MovingCatalogQuery = {}): Promise<ApiResult<AdminMovingTruckClass[]>> {
  const api = await serverApi();
  const result = await api.GET("/admin/moving/truck-classes", { params: { query } });
  return unwrap<AdminMovingTruckClass[]>(result);
}

/** cache() so generateMetadata() and the page share one request. */
export const getMovingTruckClass = cache(async (id: string): Promise<ApiResult<AdminMovingTruckClass>> => {
  const api = await serverApi();
  const result = await api.GET("/admin/moving/truck-classes/{id}", { params: { path: { id } } });
  return unwrap<AdminMovingTruckClass>(result);
});

export interface MovingTruckClassInput {
  name?: string;
  slug?: string;
  /** Rich-text HTML, sanitized server-side. */
  description?: string;
  capacityKg?: number;
  volumeM3?: number;
  /** cm — flat fields, unlike the read shape's nested `dimensions`. */
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  helperCount?: number;
  /** Rupiah, integer */
  baseFare?: number;
  /** Rupiah per km, integer */
  perKmFare?: number;
  includedKm?: number;
  minFare?: number;
  mediaAssetId?: string;
  isActive?: boolean;
  sortOrder?: number;
}

/** Never 409s — see this file's header comment. */
export async function createMovingTruckClass(input: MovingTruckClassInput): Promise<ApiResult<AdminMovingTruckClass>> {
  const api = await serverApi();
  const result = await api.POST("/admin/moving/truck-classes", {
    body: input as unknown as components["schemas"]["CreateTruckClassDto"],
  });
  return unwrap<AdminMovingTruckClass>(result);
}

/** Never 409s — see this file's header comment. */
export async function updateMovingTruckClass(id: string, patch: MovingTruckClassInput): Promise<ApiResult<AdminMovingTruckClass>> {
  const api = await serverApi();
  const result = await api.PATCH("/admin/moving/truck-classes/{id}", {
    params: { path: { id } },
    body: patch as unknown as components["schemas"]["UpdateTruckClassDto"],
  });
  return unwrap<AdminMovingTruckClass>(result);
}

/** Unconditional delete — never 409s, see this file's header comment. */
export async function deleteMovingTruckClass(id: string): Promise<ApiResult<void>> {
  const api = await serverApi();
  const result = await api.DELETE("/admin/moving/truck-classes/{id}", { params: { path: { id } } });
  return unwrap<void>(result);
}

// ─── Add-ons ────────────────────────────────────────────────────────────────

export async function listMovingAddons(query: MovingCatalogQuery = {}): Promise<ApiResult<AdminMovingAddon[]>> {
  const api = await serverApi();
  const result = await api.GET("/admin/moving/addons", { params: { query } });
  return unwrap<AdminMovingAddon[]>(result);
}

export const getMovingAddon = cache(async (id: string): Promise<ApiResult<AdminMovingAddon>> => {
  const api = await serverApi();
  const result = await api.GET("/admin/moving/addons/{id}", { params: { path: { id } } });
  return unwrap<AdminMovingAddon>(result);
});

export interface MovingAddonInput {
  name?: string;
  slug?: string;
  /** Rich-text HTML, sanitized server-side. */
  description?: string;
  kind?: MovingAddonKind;
  pricingModel?: MovingAddonPricingModel;
  /** Rupiah, integer. Required (and must be > 0 — the Swagger-documented
   *  `minimum: 0` is wrong, 0 itself 400s) when pricingModel isn't `percent`. */
  unitPrice?: number;
  /** Basis points (20 = 0.20%). Required (> 0) when pricingModel is `percent`. */
  percentBps?: number;
  minCharge?: number;
  maxCharge?: number;
  unitLabel?: string;
  minQty?: number;
  maxQty?: number;
  doublesOnRoundTrip?: boolean;
  mediaAssetId?: string;
  isActive?: boolean;
  sortOrder?: number;
}

/** 409 when activating a second `kind: "toll"` row — at most one active
 *  toll addon is allowed at a time (MovingAddonsService.assertSingleActiveToll). */
export async function createMovingAddon(input: MovingAddonInput): Promise<ApiResult<AdminMovingAddon>> {
  const api = await serverApi();
  const result = await api.POST("/admin/moving/addons", {
    body: input as unknown as components["schemas"]["CreateMovingAddonDto"],
  });
  return unwrap<AdminMovingAddon>(result);
}

/** 409 when activating a second `kind: "toll"` row — see createMovingAddon. */
export async function updateMovingAddon(id: string, patch: MovingAddonInput): Promise<ApiResult<AdminMovingAddon>> {
  const api = await serverApi();
  const result = await api.PATCH("/admin/moving/addons/{id}", {
    params: { path: { id } },
    body: patch as unknown as components["schemas"]["UpdateMovingAddonDto"],
  });
  return unwrap<AdminMovingAddon>(result);
}

/** Unconditional delete — never 409s, see this file's header comment. */
export async function deleteMovingAddon(id: string): Promise<ApiResult<void>> {
  const api = await serverApi();
  const result = await api.DELETE("/admin/moving/addons/{id}", { params: { path: { id } } });
  return unwrap<void>(result);
}
