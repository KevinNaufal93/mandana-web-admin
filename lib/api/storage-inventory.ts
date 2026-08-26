import "server-only";
import { cache } from "react";
import { serverApi, unwrap } from "@/lib/api/server-client";
import type { ApiResult } from "@/lib/api/errors";
import type { components } from "@/lib/api/schema";
import type { StorageInventoryQuery } from "@/lib/storage/query";

/**
 * Config rows, not counts — one per facility × unit-type pair that's
 * offered. There is NO capacity/count field on this DTO despite the
 * OpenAPI summary's "sets total capacity" phrasing; capacity is simply
 * the count of matching rows in /admin/storage/units. See
 * lib/api/storage.ts's header comment for why response types are
 * hand-written rather than aliased to components["schemas"][...].
 */
export interface AdminStorageInventory {
  id: string;
  facilityId: string;
  facilitySlug: string;
  unitTypeId: string;
  unitTypeSlug: string;
  monthlyRateOverride: number | null;
  isActive: boolean;
}

export async function listStorageInventory(query: StorageInventoryQuery = {}): Promise<ApiResult<AdminStorageInventory[]>> {
  const api = await serverApi();
  const result = await api.GET("/admin/storage/inventory", { params: { query } });
  return unwrap<AdminStorageInventory[]>(result);
}

export const getStorageInventory = cache(async (id: string): Promise<ApiResult<AdminStorageInventory>> => {
  const api = await serverApi();
  const result = await api.GET("/admin/storage/inventory/{id}", { params: { path: { id } } });
  return unwrap<AdminStorageInventory>(result);
});

export interface StorageInventoryInput {
  facilityId?: string;
  unitTypeId?: string;
  /** Rupiah, integer. Overrides the unit type's base monthlyRate for this facility. */
  monthlyRateOverride?: number;
  isActive?: boolean;
}

/** 409 if a row for this facility × unit-type pair already exists. */
export async function createStorageInventory(input: StorageInventoryInput): Promise<ApiResult<AdminStorageInventory>> {
  const api = await serverApi();
  const result = await api.POST("/admin/storage/inventory", {
    body: input as unknown as components["schemas"]["CreateStorageInventoryDto"],
  });
  return unwrap<AdminStorageInventory>(result);
}

export async function updateStorageInventory(id: string, patch: StorageInventoryInput): Promise<ApiResult<AdminStorageInventory>> {
  const api = await serverApi();
  const result = await api.PATCH("/admin/storage/inventory/{id}", {
    params: { path: { id } },
    body: patch as unknown as components["schemas"]["UpdateStorageInventoryDto"],
  });
  return unwrap<AdminStorageInventory>(result);
}

export async function deleteStorageInventory(id: string): Promise<ApiResult<void>> {
  const api = await serverApi();
  const result = await api.DELETE("/admin/storage/inventory/{id}", { params: { path: { id } } });
  return unwrap<void>(result);
}
