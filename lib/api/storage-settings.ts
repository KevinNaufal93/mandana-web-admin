import "server-only";
import { cache } from "react";
import { serverApi, unwrap } from "@/lib/api/server-client";
import type { ApiResult } from "@/lib/api/errors";
import type { components } from "@/lib/api/schema";

/**
 * Deliberately the smallest file in the Storage module — same shape as
 * lib/api/moving-settings.ts (which see for the full rationale). One
 * singleton resource: no id, no list, no POST, no DELETE.
 *
 * GET auto-seeds server-side if the row is missing — StorageSettingsService
 * never 404s. A change here reprices every subsequent quote/booking
 * immediately and changes nothing already captured (bookings snapshot their
 * own insurancePct/insuranceAmount at creation time).
 */

export interface AdminStorageSettings {
  /** Whole-percent insurance premium applied to every quote/booking's rent
   *  subtotal — 20 means 20%, unlike Moving's addon percentBps, which is
   *  basis points. Never share a formatter between the two. 0 disables the
   *  insurance line entirely. */
  insurancePct: number;
}

/** cache() so generateMetadata() (if ever added) and the page share one request. */
export const getStorageSettings = cache(async (): Promise<ApiResult<AdminStorageSettings>> => {
  const api = await serverApi();
  const result = await api.GET("/admin/storage/settings", {});
  return unwrap<AdminStorageSettings>(result);
});

export interface StorageSettingsInput {
  insurancePct?: number;
}

export async function updateStorageSettings(patch: StorageSettingsInput): Promise<ApiResult<AdminStorageSettings>> {
  const api = await serverApi();
  const result = await api.PATCH("/admin/storage/settings", {
    body: patch as unknown as components["schemas"]["UpdateStorageSettingsDto"],
  });
  return unwrap<AdminStorageSettings>(result);
}
