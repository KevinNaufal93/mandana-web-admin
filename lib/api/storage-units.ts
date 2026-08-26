import "server-only";
import { cache } from "react";
import { serverApi, unwrap, unwrapPaginated, type Paginated } from "@/lib/api/server-client";
import type { ApiResult } from "@/lib/api/errors";
import type { components } from "@/lib/api/schema";
import type { StorageUnitQuery, StorageUnitStatus } from "@/lib/storage/query";

/**
 * The individual physical rows behind the inventory counts. Grid fields
 * (gridColumn/gridRow/columnSpan/rowSpan) all exist on the DTO but are
 * null for every seeded unit today ("omit until a real floor survey
 * exists" — see docs/storage-admin-integration-plan.md) — deliberately
 * left out of every form in this file's callers.
 */
export interface AdminStorageUnit {
  id: string;
  facilityId: string;
  facilitySlug: string;
  unitTypeId: string;
  unitTypeSlug: string;
  code: string;
  status: StorageUnitStatus;
  bookingId: string | null;
  isActive: boolean;
}

export async function listStorageUnits(query: StorageUnitQuery): Promise<ApiResult<Paginated<AdminStorageUnit>>> {
  const api = await serverApi();
  const result = await api.GET("/admin/storage/units", { params: { query } });
  return unwrapPaginated<AdminStorageUnit>(result);
}

export const getStorageUnit = cache(async (id: string): Promise<ApiResult<AdminStorageUnit>> => {
  const api = await serverApi();
  const result = await api.GET("/admin/storage/units/{id}", { params: { path: { id } } });
  return unwrap<AdminStorageUnit>(result);
});

export interface StorageUnitInput {
  facilityId?: string;
  unitTypeId?: string;
  /** Unique per facility. Never renumber. */
  code?: string;
  status?: StorageUnitStatus;
  isActive?: boolean;
}

/** 409 if `code` already exists for this facility. */
export async function createStorageUnit(input: StorageUnitInput): Promise<ApiResult<AdminStorageUnit>> {
  const api = await serverApi();
  const result = await api.POST("/admin/storage/units", {
    body: input as unknown as components["schemas"]["CreateStorageUnitDto"],
  });
  return unwrap<AdminStorageUnit>(result);
}

export async function updateStorageUnit(id: string, patch: StorageUnitInput): Promise<ApiResult<AdminStorageUnit>> {
  const api = await serverApi();
  const result = await api.PATCH("/admin/storage/units/{id}", {
    params: { path: { id } },
    body: patch as unknown as components["schemas"]["UpdateStorageUnitDto"],
  });
  return unwrap<AdminStorageUnit>(result);
}

/** 409 if the unit is currently occupied (attached to a live booking). */
export async function deleteStorageUnit(id: string): Promise<ApiResult<void>> {
  const api = await serverApi();
  const result = await api.DELETE("/admin/storage/units/{id}", { params: { path: { id } } });
  return unwrap<void>(result);
}

export interface StorageUnitsBulkInput {
  facilityId: string;
  unitTypeId: string;
  /** 1-500 */
  count: number;
  /** Codes are generated as "<prefix>-<NN>", continuing from the highest
   *  existing sequence number for this facility + prefix. */
  codePrefix: string;
}

/** Returns the bare array of newly created units (HTTP 200, NOT
 *  paginated) — unwrap<T[]>, not unwrapPaginated, unlike listStorageUnits
 *  above. The ops-facing "add capacity fast" tool. */
export async function bulkCreateStorageUnits(input: StorageUnitsBulkInput): Promise<ApiResult<AdminStorageUnit[]>> {
  const api = await serverApi();
  const result = await api.POST("/admin/storage/units/bulk", {
    body: input as unknown as components["schemas"]["BulkCreateStorageUnitsDto"],
  });
  return unwrap<AdminStorageUnit[]>(result);
}
