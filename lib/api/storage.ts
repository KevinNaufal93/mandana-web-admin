import "server-only";
import { cache } from "react";
import { serverApi, unwrap, type Paginated } from "@/lib/api/server-client";
import type { ApiResult } from "@/lib/api/errors";
import type { components } from "@/lib/api/schema";
import type { StorageCatalogQuery } from "@/lib/storage/query";

/**
 * Same rationale as lib/api/event-support.ts's header comment: the admin
 * storage routes carry real @ApiOkResponse DTOs (StorageFacilityDto,
 * StorageUnitTypeDto, ...) already present in the live schema.d.ts, so
 * openapi-fetch gives real request AND response typing. Response types
 * below are still hand-written rather than aliased straight to
 * components["schemas"][...], for the same decoupling reason.
 *
 * `Paginated` is imported only for re-export convenience elsewhere in this
 * module family — facilities/unit-types themselves are NOT paginated
 * endpoints (see StorageAdminController_findAllFacilities_v1 /
 * _findAllUnitTypes_v1: query is just `{ isActive? }`, response is a bare
 * array).
 */
export type { Paginated };

export interface StorageImage {
  url: string;
  srcset: string;
  alt: string | null;
  width: number;
  height: number;
}

/** Read shape nests dimensions; the write DTOs (below) take them flat —
 *  see CreateStorageUnitTypeDto/UpdateStorageUnitTypeDto in schema.d.ts.
 *  Forms must unpack on load and flatten on submit. */
export interface StorageDimensions {
  lengthCm: number;
  widthCm: number;
  heightCm: number;
}

export interface AdminStorageUnitType {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  descriptionText: string | null;
  volumeM3: number | null;
  dimensions: StorageDimensions | null;
  /** Rupiah, integer */
  monthlyRate: number;
  minDurationMonths: number;
  /** Rupiah, integer. Independent of monthlyRate — null unless supportsWeekly. */
  weeklyRate: number | null;
  supportsWeekly: boolean;
  /** Falls back to 1 when null. */
  minDurationWeeks: number | null;
  image: StorageImage | null;
  isActive: boolean;
  sortOrder: number;
}

export interface AdminStorageFacility {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  descriptionText: string | null;
  address: string | null;
  area: string | null;
  city: string | null;
  province: string | null;
  latitude: number | null;
  longitude: number | null;
  image: StorageImage | null;
  isActive: boolean;
  sortOrder: number;
}

// ─── Unit types ─────────────────────────────────────────────────────────────

export async function listStorageUnitTypes(query: StorageCatalogQuery = {}): Promise<ApiResult<AdminStorageUnitType[]>> {
  const api = await serverApi();
  const result = await api.GET("/admin/storage/unit-types", { params: { query } });
  return unwrap<AdminStorageUnitType[]>(result);
}

/** cache() so generateMetadata() and the page share one request. */
export const getStorageUnitType = cache(async (id: string): Promise<ApiResult<AdminStorageUnitType>> => {
  const api = await serverApi();
  const result = await api.GET("/admin/storage/unit-types/{id}", { params: { path: { id } } });
  return unwrap<AdminStorageUnitType>(result);
});

export interface StorageUnitTypeInput {
  name?: string;
  slug?: string;
  /** Rich-text HTML, sanitized server-side. */
  description?: string;
  volumeM3?: number;
  /** cm — flat fields, unlike the read shape's nested `dimensions`. */
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  /** Rupiah, integer */
  monthlyRate?: number;
  minDurationMonths?: number;
  /** Rupiah, integer. Independent of monthlyRate — set explicitly, never derived.
   *  `null` clears it (server: `undefined` leaves the stored value untouched,
   *  `null` nulls the column) — always send `null` for a blanked field on
   *  edit, never omit it. */
  weeklyRate?: number | null;
  /** Requires a positive weeklyRate (here or already on the record) — a 400 otherwise. */
  supportsWeekly?: boolean;
  /** `null` clears it (falls back to 1 week) — same undefined-vs-null rule as weeklyRate. */
  minDurationWeeks?: number | null;
  mediaAssetId?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export async function createStorageUnitType(input: StorageUnitTypeInput): Promise<ApiResult<AdminStorageUnitType>> {
  const api = await serverApi();
  const result = await api.POST("/admin/storage/unit-types", {
    body: input as unknown as components["schemas"]["CreateStorageUnitTypeDto"],
  });
  return unwrap<AdminStorageUnitType>(result);
}

export async function updateStorageUnitType(id: string, patch: StorageUnitTypeInput): Promise<ApiResult<AdminStorageUnitType>> {
  const api = await serverApi();
  const result = await api.PATCH("/admin/storage/unit-types/{id}", {
    params: { path: { id } },
    body: patch as unknown as components["schemas"]["UpdateStorageUnitTypeDto"],
  });
  return unwrap<AdminStorageUnitType>(result);
}

/** 409 while any inventory row still references this unit type. */
export async function deleteStorageUnitType(id: string): Promise<ApiResult<void>> {
  const api = await serverApi();
  const result = await api.DELETE("/admin/storage/unit-types/{id}", { params: { path: { id } } });
  return unwrap<void>(result);
}

// ─── Facilities ─────────────────────────────────────────────────────────────

export async function listStorageFacilities(query: StorageCatalogQuery = {}): Promise<ApiResult<AdminStorageFacility[]>> {
  const api = await serverApi();
  const result = await api.GET("/admin/storage/facilities", { params: { query } });
  return unwrap<AdminStorageFacility[]>(result);
}

export const getStorageFacility = cache(async (id: string): Promise<ApiResult<AdminStorageFacility>> => {
  const api = await serverApi();
  const result = await api.GET("/admin/storage/facilities/{id}", { params: { path: { id } } });
  return unwrap<AdminStorageFacility>(result);
});

export interface StorageFacilityInput {
  name?: string;
  slug?: string;
  /** Rich-text HTML, sanitized server-side. */
  description?: string;
  address?: string;
  area?: string;
  city?: string;
  province?: string;
  /** Exact coordinates — no location-privacy fuzzing applies to facilities. */
  latitude?: number;
  longitude?: number;
  mediaAssetId?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export async function createStorageFacility(input: StorageFacilityInput): Promise<ApiResult<AdminStorageFacility>> {
  const api = await serverApi();
  const result = await api.POST("/admin/storage/facilities", {
    body: input as unknown as components["schemas"]["CreateStorageFacilityDto"],
  });
  return unwrap<AdminStorageFacility>(result);
}

export async function updateStorageFacility(id: string, patch: StorageFacilityInput): Promise<ApiResult<AdminStorageFacility>> {
  const api = await serverApi();
  const result = await api.PATCH("/admin/storage/facilities/{id}", {
    params: { path: { id } },
    body: patch as unknown as components["schemas"]["UpdateStorageFacilityDto"],
  });
  return unwrap<AdminStorageFacility>(result);
}

/** 409 while any inventory or unit row still references this facility. */
export async function deleteStorageFacility(id: string): Promise<ApiResult<void>> {
  const api = await serverApi();
  const result = await api.DELETE("/admin/storage/facilities/{id}", { params: { path: { id } } });
  return unwrap<void>(result);
}
