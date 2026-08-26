/**
 * Whitelists and clamps the admin Smart Storage list query params before
 * they reach the API. Copy of lib/event-support/query.ts's shape — same
 * "copy, don't generify" precedent (see that file's header comment).
 *
 * Contract deltas vs. event-support, worth calling out explicitly:
 *  - Storage bookings have NO search and NO from/to date range — the
 *    DTO genuinely doesn't support them. Don't invent the fields.
 *  - Facility/unit-type filters on bookings are by SLUG, not id.
 *  - Units are paginated + filterable by facility/unit-type id and status;
 *    inventory is unpaginated and filterable by facility/unit-type id only.
 */

export const STORAGE_UNIT_STATUSES = ["available", "occupied", "maintenance"] as const;
export type StorageUnitStatus = (typeof STORAGE_UNIT_STATUSES)[number];

export const STORAGE_BOOKING_STATUSES = ["pending", "confirmed", "rejected", "cancelled", "completed"] as const;
export type StorageBookingStatus = (typeof STORAGE_BOOKING_STATUSES)[number];

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type RawSearchParams = { [key: string]: string | string[] | undefined };

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

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

export interface StorageBookingQuery {
  page: number;
  limit: number;
  status?: StorageBookingStatus;
  facilitySlug?: string;
  unitTypeSlug?: string;
}

export function parseStorageBookingQuery(raw: RawSearchParams): StorageBookingQuery {
  const pageRaw = Number(first(raw.page));
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : DEFAULT_PAGE;

  const limitRaw = Number(first(raw.limit));
  const limit = Number.isFinite(limitRaw) && limitRaw >= 1 ? Math.min(Math.floor(limitRaw), MAX_LIMIT) : DEFAULT_LIMIT;

  const statusRaw = first(raw.status);
  const status = (STORAGE_BOOKING_STATUSES as readonly string[]).includes(statusRaw ?? "")
    ? (statusRaw as StorageBookingStatus)
    : undefined;

  const facilitySlug = first(raw.facilitySlug)?.trim() || undefined;
  const unitTypeSlug = first(raw.unitTypeSlug)?.trim() || undefined;

  return { page, limit, status, facilitySlug, unitTypeSlug };
}

export function toStorageBookingSearchString(query: StorageBookingQuery, patch: Partial<StorageBookingQuery>): string {
  const merged = { ...query, ...patch };
  const params = new URLSearchParams();
  if (merged.page && merged.page !== DEFAULT_PAGE) params.set("page", String(merged.page));
  if (merged.limit && merged.limit !== DEFAULT_LIMIT) params.set("limit", String(merged.limit));
  if (merged.status) params.set("status", merged.status);
  if (merged.facilitySlug) params.set("facilitySlug", merged.facilitySlug);
  if (merged.unitTypeSlug) params.set("unitTypeSlug", merged.unitTypeSlug);
  const s = params.toString();
  return s ? `?${s}` : "";
}
