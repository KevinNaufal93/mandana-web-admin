/**
 * Whitelists and clamps the admin Moving Support list query params before
 * they reach the API. Copy of lib/storage/query.ts's shape — same
 * "copy, don't generify" precedent (see that file's header comment).
 *
 * Contract deltas vs. storage, worth calling out explicitly:
 *  - BOTH catalog entities (truck classes AND add-ons) are unpaginated,
 *    filterable only by isActive — unlike storage, which splits catalog
 *    (unpaginated) from units (paginated). Moving has no paginated catalog
 *    resource at all until leads.
 *  - Leads have no state machine — `status` is free-form CRM triage (any
 *    of four values to any other), not a booking-style pending/confirmed
 *    lifecycle. See MovingLeadStatus.
 *  - Leads' from/to bound CAPTURE time (createdAt), not an event/booking
 *    window — unlike Event Support's EventBookingQuery, whose from/to
 *    bound the event date itself. A Moving lead has no event window.
 *  - Leads default limit=12, matching QueryMovingLeadsDto's own
 *    PaginationQueryDto default — verify against that DTO if the backend
 *    ever changes it, don't copy storage's 20 or assume it stays 12.
 */

export const MOVING_LEAD_STATUSES = ["new", "contacted", "converted", "lost"] as const;
export type MovingLeadStatus = (typeof MOVING_LEAD_STATUSES)[number];

export const MOVING_ADDON_KINDS = ["helper", "packaging", "waiting", "insurance", "toll", "other"] as const;
export type MovingAddonKind = (typeof MOVING_ADDON_KINDS)[number];

export const MOVING_ADDON_PRICING_MODELS = ["flat", "per_unit", "percent"] as const;
export type MovingAddonPricingModel = (typeof MOVING_ADDON_PRICING_MODELS)[number];

const DEFAULT_PAGE = 1;
// Moving leads' PaginationQueryDto defaults limit to 12 server-side — same
// value as event-support items, but verify against
// query-moving-leads.dto.ts if this ever needs re-checking; it's a
// coincidence, not a shared constant.
const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 100;
const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

type RawSearchParams = { [key: string]: string | string[] | undefined };

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

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

// ─── Leads ──────────────────────────────────────────────────────────────────

export interface MovingLeadQuery {
  page: number;
  limit: number;
  status?: MovingLeadStatus;
  search?: string;
  from?: string;
  to?: string;
}

export function parseMovingLeadQuery(raw: RawSearchParams): MovingLeadQuery {
  const pageRaw = Number(first(raw.page));
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : DEFAULT_PAGE;

  const limitRaw = Number(first(raw.limit));
  const limit = Number.isFinite(limitRaw) && limitRaw >= 1 ? Math.min(Math.floor(limitRaw), MAX_LIMIT) : DEFAULT_LIMIT;

  const statusRaw = first(raw.status);
  const status = (MOVING_LEAD_STATUSES as readonly string[]).includes(statusRaw ?? "")
    ? (statusRaw as MovingLeadStatus)
    : undefined;

  const searchRaw = first(raw.search)?.trim();
  const search = searchRaw ? searchRaw : undefined;

  const fromRaw = first(raw.from);
  const from = fromRaw && DATE_ONLY_RE.test(fromRaw) ? fromRaw : undefined;

  const toRaw = first(raw.to);
  const to = toRaw && DATE_ONLY_RE.test(toRaw) ? toRaw : undefined;

  return { page, limit, status, search, from, to };
}

/**
 * Builds a "?..." query string from the current filters plus a patch,
 * dropping default/empty values. Used by the filter bar and pagination
 * links so navigating never drops the other active filters.
 */
export function toMovingLeadSearchString(query: MovingLeadQuery, patch: Partial<MovingLeadQuery>): string {
  const merged = { ...query, ...patch };
  const params = new URLSearchParams();
  if (merged.page && merged.page !== DEFAULT_PAGE) params.set("page", String(merged.page));
  if (merged.limit && merged.limit !== DEFAULT_LIMIT) params.set("limit", String(merged.limit));
  if (merged.status) params.set("status", merged.status);
  if (merged.search) params.set("search", merged.search);
  if (merged.from) params.set("from", merged.from);
  if (merged.to) params.set("to", merged.to);
  const s = params.toString();
  return s ? `?${s}` : "";
}
