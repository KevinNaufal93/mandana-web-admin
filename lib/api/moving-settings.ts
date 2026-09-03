import "server-only";
import { cache } from "react";
import { serverApi, unwrap } from "@/lib/api/server-client";
import type { ApiResult } from "@/lib/api/errors";
import type { components } from "@/lib/api/schema";

/**
 * Deliberately the smallest file in the Moving module — kept separate from
 * lib/api/moving.ts rather than folded in, matching how storage-inventory.ts
 * stays split from storage.ts even though it's small. Two functions, one
 * singleton resource: no id, no list, no POST, no DELETE.
 *
 * GET auto-seeds server-side if the row is missing — MovingSettingsService
 * never 404s. A change here reprices every subsequent quote/lead capture
 * immediately and changes nothing already captured (leads snapshot their
 * own numbers at creation time).
 */

export interface AdminMovingSettings {
  /** Rupiah rounding step applied to the quote total. */
  roundToIdr: number;
  /** The ± percentage band shown to the customer around the total — a
   *  WHOLE percent (10 = ±10%), unlike addons' percentBps, which is basis
   *  points (20 = 0.20%). Never share a formatter between the two. */
  bandPct: number;
  /** Fallback included-km used when a truck class doesn't set its own. */
  defaultIncludedKm: number;
}

/** cache() so generateMetadata() (if ever added) and the page share one request. */
export const getMovingSettings = cache(async (): Promise<ApiResult<AdminMovingSettings>> => {
  const api = await serverApi();
  const result = await api.GET("/admin/moving/settings", {});
  return unwrap<AdminMovingSettings>(result);
});

export interface MovingSettingsInput {
  roundToIdr?: number;
  bandPct?: number;
  defaultIncludedKm?: number;
}

export async function updateMovingSettings(patch: MovingSettingsInput): Promise<ApiResult<AdminMovingSettings>> {
  const api = await serverApi();
  const result = await api.PATCH("/admin/moving/settings", {
    body: patch as unknown as components["schemas"]["UpdateMovingSettingsDto"],
  });
  return unwrap<AdminMovingSettings>(result);
}
