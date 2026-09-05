import "server-only";
import { serverApi, unwrap } from "@/lib/api/server-client";
import type { ApiResult } from "@/lib/api/errors";

/**
 * The PUBLIC availability snapshot (GET /storage/availability, no
 * /admin prefix) — reused here as the Ketersediaan tab's data source
 * since it already aggregates available/occupied/maintenance counts per
 * facility × unit type, which nothing on the admin side computes for us.
 * Still called through serverApi() (Bearer-authenticated) for
 * consistency with every other call in this app; the endpoint itself
 * doesn't require it.
 *
 * `layout` (grid positions) is intentionally not modeled here — every
 * seeded unit has null grid fields (see lib/api/storage-units.ts's header
 * comment), so there is nothing to render from it yet.
 */
export interface StorageAvailabilityUnitType {
  unitTypeSlug: string;
  total: number;
  available: number;
  occupied: number;
  maintenance: number;
  /** Rupiah, integer */
  monthlyRate: number;
  /** Rupiah, integer. Already override-resolved, like monthlyRate. Null unless supportsWeekly. */
  weeklyRate: number | null;
  supportsWeekly: boolean;
}

export interface StorageAvailabilityFacility {
  facilitySlug: string;
  facilityName: string;
  units: StorageAvailabilityUnitType[];
}

export interface StorageAvailabilitySnapshot {
  version: string;
  generatedAt: string;
  facilities: StorageAvailabilityFacility[];
}

export async function getStorageAvailability(): Promise<ApiResult<StorageAvailabilitySnapshot>> {
  const api = await serverApi();
  const result = await api.GET("/storage/availability");
  return unwrap<StorageAvailabilitySnapshot>(result);
}
