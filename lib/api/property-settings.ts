import "server-only";
import { cache } from "react";
import { serverApi, unwrap } from "@/lib/api/server-client";
import type { ApiResult } from "@/lib/api/errors";
import type { components } from "@/lib/api/schema";

/**
 * Same shape as lib/api/storage-settings.ts: one singleton resource, no id,
 * no list, no POST, no DELETE. GET auto-seeds server-side if the row is
 * missing (PropertySettingsService), so it never 404s.
 *
 * Holds the KPR (mortgage) simulator's fixed rate and tenor, shown on the
 * public property detail page for properties that are for sale. The API
 * stores the rate as basis points but speaks percent on the wire, so
 * `kprAnnualRatePct` here is the number staff type: 1.75 means 1.75%.
 */

export interface AdminPropertySettings {
  /** Fixed interest rate, percent per year (1.75 = 1.75%). Up to 2 decimals. */
  kprAnnualRatePct: number;
  /** Tenor in whole years. */
  kprTenorYears: number;
}

/** cache() so generateMetadata() (if ever added) and the page share one request. */
export const getPropertySettings = cache(async (): Promise<ApiResult<AdminPropertySettings>> => {
  const api = await serverApi();
  const result = await api.GET("/admin/property-settings", {});
  return unwrap<AdminPropertySettings>(result);
});

export interface PropertySettingsInput {
  kprAnnualRatePct?: number;
  kprTenorYears?: number;
}

export async function updatePropertySettings(
  patch: PropertySettingsInput,
): Promise<ApiResult<AdminPropertySettings>> {
  const api = await serverApi();
  const result = await api.PATCH("/admin/property-settings", {
    body: patch as unknown as components["schemas"]["UpdatePropertySettingsDto"],
  });
  return unwrap<AdminPropertySettings>(result);
}
