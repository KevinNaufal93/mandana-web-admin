import "server-only";
import { cache } from "react";
import { serverApi, unwrap } from "@/lib/api/server-client";
import type { ApiResult } from "@/lib/api/errors";
import type { components } from "@/lib/api/schema";

/**
 * Deliberately its own file, matching lib/api/moving-settings.ts — kept
 * separate from event-support.ts / event-support-bookings.ts rather than
 * folded in. Two functions, one singleton resource: no id, no list, no
 * POST, no DELETE.
 *
 * GET auto-seeds server-side if the row is missing, so this never 404s.
 * Changing any of this reprices every subsequent quote/booking
 * immediately — nothing here retroactively changes a booking already
 * recorded, since each line snapshots its own unitPrice/billingMode at
 * creation time.
 */

export interface AdminEventSupportSettings {
  /** The hourly/daily cutoff, in hours. */
  hourlyThresholdHours: number;
  /** Whether a window exactly at hourlyThresholdHours still bills hourly
   *  (<=) or falls to daily (<). */
  hourlyThresholdInclusive: boolean;
  /** Fallback minimum billable hours when an item sets no minimumHours
   *  of its own. */
  defaultMinimumHours: number;
  /** Billable-hours rounding step, in minutes. */
  roundingUnitMinutes: number;
  /** When true, an hourly line total never exceeds pricePerDay * quantity. */
  capHourlyAtDailyRate: boolean;
  overThresholdMode: "whole_days" | "day_plus_hourly";
  /** Whether pricePerDay/hourlyRate already include Jabodetabek delivery. */
  priceIncludesJabodetabekDelivery: boolean;
  outsideJabodetabekNote: string | null;
}

/** cache() so generateMetadata() (if ever added) and the page share one request. */
export const getEventSupportSettings = cache(async (): Promise<ApiResult<AdminEventSupportSettings>> => {
  const api = await serverApi();
  const result = await api.GET("/admin/event-support/settings", {});
  return unwrap<AdminEventSupportSettings>(result);
});

export interface EventSupportSettingsInput {
  hourlyThresholdHours?: number;
  hourlyThresholdInclusive?: boolean;
  defaultMinimumHours?: number;
  roundingUnitMinutes?: number;
  capHourlyAtDailyRate?: boolean;
  overThresholdMode?: "whole_days" | "day_plus_hourly";
  priceIncludesJabodetabekDelivery?: boolean;
  /** null clears the note. */
  outsideJabodetabekNote?: string | null;
}

export async function updateEventSupportSettings(
  patch: EventSupportSettingsInput,
): Promise<ApiResult<AdminEventSupportSettings>> {
  const api = await serverApi();
  const result = await api.PATCH("/admin/event-support/settings", {
    body: patch as unknown as components["schemas"]["UpdateEventSupportSettingsDto"],
  });
  return unwrap<AdminEventSupportSettings>(result);
}
