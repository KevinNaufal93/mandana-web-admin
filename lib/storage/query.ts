/**
 * Whitelists and clamps the admin Smart Storage list query params before
 * they reach the API.
 *
 * The Bookings section shares its vocabulary with Moving and Event
 * Support's booking lists — see docs/booking-list-contract.md and
 * lib/bookings/query.ts, which this extends exactly the way the API's own
 * `QueryStorageBookingsDto extends BookingListQueryDto` does.
 *
 * The Catalog/Inventory/Units sections below have no equivalent on the
 * other two modules (Moving has no paginated catalog resource at all until
 * bookings; Event Support's catalog is items/categories, shaped
 * differently) and stay a "copy, don't generify" file of their own, same
 * precedent as lib/event-support/query.ts's non-booking sections.
 *
 * Contract deltas vs. Moving/Event Support's booking lists, worth calling
 * out explicitly:
 *  - Facility/unit-type filters on bookings are by SLUG, not id.
 *  - `sortBy` additionally allows `startDate` (Moving has no window, so it
 *    lacks this option; Event Support has one and also allows it).
 */
import {
  BookingListQuery,
  DEFAULT_BOOKING_SORT_BY,
  RawSearchParams,
  UUID_RE,
  appendBookingListParams,
  first,
  parseBookingListQuery,
  parseEnumParam,
} from "@/lib/bookings/query";

export const STORAGE_UNIT_STATUSES = ["available", "occupied", "maintenance"] as const;
export type StorageUnitStatus = (typeof STORAGE_UNIT_STATUSES)[number];

export const STORAGE_BOOKING_STATUSES = ["pending", "confirmed", "rejected", "cancelled", "completed"] as const;
export type StorageBookingStatus = (typeof STORAGE_BOOKING_STATUSES)[number];

export const STORAGE_BOOKING_SORTS = ["createdAt", "reference", "total", "startDate"] as const;
export type StorageBookingSort = (typeof STORAGE_BOOKING_SORTS)[number];

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// ─── Catalog (facilities + unit types) ─────────────────────────────────────

export interface StorageCatalogQuery {
  isActive?: boolean;
}

export function parseStorageCatalogQuery(raw: RawSearchParams): StorageCatalogQuery {
  const isActiveRaw = first(raw.isActive);
  const isActive = isActiveRaw === "true" ? true : isActiveRaw === "false" ? false : undefined;
  return { isActive };
}

export function toCatalogSearchString(patch: Partial<StorageCatalogQuery>): string {
  const params = new URLSearchParams();
  if (patch.isActive !== undefined) params.set("isActive", String(patch.isActive));
  const s = params.toString();
  return s ? `?${s}` : "";
}

// ─── Inventory ──────────────────────────────────────────────────────────────

export interface StorageInventoryQuery {
  facilityId?: string;
  unitTypeId?: string;
}

export function parseStorageInventoryQuery(raw: RawSearchParams): StorageInventoryQuery {
  const facilityIdRaw = first(raw.facilityId);
  const facilityId = facilityIdRaw && UUID_RE.test(facilityIdRaw) ? facilityIdRaw : undefined;

  const unitTypeIdRaw = first(raw.unitTypeId);
  const unitTypeId = unitTypeIdRaw && UUID_RE.test(unitTypeIdRaw) ? unitTypeIdRaw : undefined;

  return { facilityId, unitTypeId };
}

export function toInventorySearchString(patch: Partial<StorageInventoryQuery>): string {
  const params = new URLSearchParams();
  if (patch.facilityId) params.set("facilityId", patch.facilityId);
  if (patch.unitTypeId) params.set("unitTypeId", patch.unitTypeId);
  const s = params.toString();
  return s ? `?${s}` : "";
}

// ─── Units ──────────────────────────────────────────────────────────────────

export interface StorageUnitQuery {
  page: number;
  limit: number;
  facilityId?: string;
  unitTypeId?: string;
  status?: StorageUnitStatus;
}

export function parseStorageUnitQuery(raw: RawSearchParams): StorageUnitQuery {
  const pageRaw = Number(first(raw.page));
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : DEFAULT_PAGE;

  const limitRaw = Number(first(raw.limit));
  const limit = Number.isFinite(limitRaw) && limitRaw >= 1 ? Math.min(Math.floor(limitRaw), MAX_LIMIT) : DEFAULT_LIMIT;

  const facilityIdRaw = first(raw.facilityId);
  const facilityId = facilityIdRaw && UUID_RE.test(facilityIdRaw) ? facilityIdRaw : undefined;

  const unitTypeIdRaw = first(raw.unitTypeId);
  const unitTypeId = unitTypeIdRaw && UUID_RE.test(unitTypeIdRaw) ? unitTypeIdRaw : undefined;

  const statusRaw = first(raw.status);
  const status = (STORAGE_UNIT_STATUSES as readonly string[]).includes(statusRaw ?? "")
    ? (statusRaw as StorageUnitStatus)
    : undefined;

  return { page, limit, facilityId, unitTypeId, status };
}

export function toUnitSearchString(query: StorageUnitQuery, patch: Partial<StorageUnitQuery>): string {
  const merged = { ...query, ...patch };
  const params = new URLSearchParams();
  if (merged.page && merged.page !== DEFAULT_PAGE) params.set("page", String(merged.page));
  if (merged.limit && merged.limit !== DEFAULT_LIMIT) params.set("limit", String(merged.limit));
  if (merged.facilityId) params.set("facilityId", merged.facilityId);
  if (merged.unitTypeId) params.set("unitTypeId", merged.unitTypeId);
  if (merged.status) params.set("status", merged.status);
  const s = params.toString();
  return s ? `?${s}` : "";
}

// ─── Bookings ───────────────────────────────────────────────────────────────

export interface StorageBookingQuery extends BookingListQuery {
  status?: StorageBookingStatus;
  sortBy: StorageBookingSort;
  /** StorageFacility.slug */
  facilitySlug?: string;
  /** StorageUnitType.slug */
  unitTypeSlug?: string;
}

export function parseStorageBookingQuery(raw: RawSearchParams): StorageBookingQuery {
  const base = parseBookingListQuery(raw);

  const status = parseEnumParam(first(raw.status), STORAGE_BOOKING_STATUSES);
  const sortBy = parseEnumParam(first(raw.sortBy), STORAGE_BOOKING_SORTS) ?? DEFAULT_BOOKING_SORT_BY;

  const facilitySlug = first(raw.facilitySlug)?.trim() || undefined;
  const unitTypeSlug = first(raw.unitTypeSlug)?.trim() || undefined;

  return { ...base, status, sortBy, facilitySlug, unitTypeSlug };
}

export function toStorageBookingSearchString(query: StorageBookingQuery, patch: Partial<StorageBookingQuery>): string {
  const merged = { ...query, ...patch };
  const params = new URLSearchParams();
  if (merged.status) params.set("status", merged.status);
  appendBookingListParams(params, merged);
  if (merged.sortBy && merged.sortBy !== DEFAULT_BOOKING_SORT_BY) params.set("sortBy", merged.sortBy);
  if (merged.facilitySlug) params.set("facilitySlug", merged.facilitySlug);
  if (merged.unitTypeSlug) params.set("unitTypeSlug", merged.unitTypeSlug);
  const s = params.toString();
  return s ? `?${s}` : "";
}
