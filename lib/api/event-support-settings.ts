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
 * As of the 8-hour-pricing rewrite (2026-09-08) there is no pricing policy
 * left here at all — the old hourly/daily threshold, rounding step,
 * minimum-hours fallback, and over-threshold mode are gone; "8 hours" is a
 * server-side constant, not a setting. This singleton now holds only the
 * Jabodetabek-delivery disclosure. Changing it reprices nothing already
 * quoted or booked — each line snapshots its own unitPrice/billingMode at
 * creation time.
 */

export interface AdminEventSupportSettings {
  /** Whether pricePerDay/eightHourRate already include Jabodetabek delivery. */
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
