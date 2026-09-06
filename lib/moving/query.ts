/**
 * Whitelists and clamps the admin Moving Support list query params before
 * they reach the API.
 *
 * The Bookings section shares its vocabulary with Storage and Event
 * Support's booking lists — see docs/booking-list-contract.md and
 * lib/bookings/query.ts, which this extends exactly the way the API's own
 * `QueryMovingBookingsDto extends BookingListQueryDto` does. Moving's
 * bookings used to be called "leads" with free-form CRM triage
 * (new/contacted/converted/lost) and no state machine — the API renamed
 * the resource and gave it the same pending/confirmed/rejected/cancelled/
 * completed lifecycle Storage bookings already had (see
 * moving-admin-integration.md).
 *
 * Contract deltas vs. Storage/Event Support's booking lists:
 *  - No `sortBy: "startDate"` — a Moving booking has no rental/event
 *    window to sort by, unlike Storage and Event Support.
 *  - No module-specific filters beyond the shared vocabulary.
 *
 * The Catalog section (truck classes + add-ons) has no booking-list
 * equivalent and stays a "copy, don't generify" file of its own — both
 * catalog entities are unpaginated, filterable only by isActive, unlike
 * Storage which splits catalog (unpaginated) from units (paginated).
 */
import {
  BookingListQuery,
  DEFAULT_BOOKING_SORT_BY,
  RawSearchParams,
  appendBookingListParams,
  first,
  parseBookingListQuery,
  parseEnumParam,
} from "@/lib/bookings/query";

export const MOVING_BOOKING_STATUSES = ["pending", "confirmed", "rejected", "cancelled", "completed"] as const;
export type MovingBookingStatus = (typeof MOVING_BOOKING_STATUSES)[number];

export const MOVING_BOOKING_SORTS = ["createdAt", "reference", "total"] as const;
export type MovingBookingSort = (typeof MOVING_BOOKING_SORTS)[number];

export const MOVING_ADDON_KINDS = ["helper", "packaging", "waiting", "insurance", "toll", "other"] as const;
export type MovingAddonKind = (typeof MOVING_ADDON_KINDS)[number];

export const MOVING_ADDON_PRICING_MODELS = ["flat", "per_unit", "percent"] as const;
export type MovingAddonPricingModel = (typeof MOVING_ADDON_PRICING_MODELS)[number];

// ─── Catalog (truck classes + add-ons) ─────────────────────────────────────

export interface MovingCatalogQuery {
  isActive?: boolean;
}

export function parseMovingCatalogQuery(raw: RawSearchParams): MovingCatalogQuery {
  const isActiveRaw = first(raw.isActive);
  const isActive = isActiveRaw === "true" ? true : isActiveRaw === "false" ? false : undefined;
  return { isActive };
}

export function toMovingCatalogSearchString(patch: Partial<MovingCatalogQuery>): string {
  const params = new URLSearchParams();
  if (patch.isActive !== undefined) params.set("isActive", String(patch.isActive));
  const s = params.toString();
  return s ? `?${s}` : "";
}

// ─── Bookings ───────────────────────────────────────────────────────────────

export interface MovingBookingQuery extends BookingListQuery {
  status?: MovingBookingStatus;
  sortBy: MovingBookingSort;
}

export function parseMovingBookingQuery(raw: RawSearchParams): MovingBookingQuery {
  const base = parseBookingListQuery(raw);

  const status = parseEnumParam(first(raw.status), MOVING_BOOKING_STATUSES);
  const sortBy = parseEnumParam(first(raw.sortBy), MOVING_BOOKING_SORTS) ?? DEFAULT_BOOKING_SORT_BY;

  return { ...base, status, sortBy };
}

/**
 * Builds a "?..." query string from the current filters plus a patch,
 * dropping default/empty values. Used by the filter bar and pagination
 * links so navigating never drops the other active filters.
 */
export function toMovingBookingSearchString(query: MovingBookingQuery, patch: Partial<MovingBookingQuery>): string {
  const merged = { ...query, ...patch };
  const params = new URLSearchParams();
  if (merged.status) params.set("status", merged.status);
  appendBookingListParams(params, merged);
  if (merged.sortBy && merged.sortBy !== DEFAULT_BOOKING_SORT_BY) params.set("sortBy", merged.sortBy);
  const s = params.toString();
  return s ? `?${s}` : "";
}
