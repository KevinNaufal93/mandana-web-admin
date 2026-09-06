/**
 * Whitelists and clamps the admin event-support list query params before
 * they reach the API. The global ValidationPipe runs with
 * forbidNonWhitelisted:true — an unrecognized key or a bad enum value is a
 * 400, not a silent ignore — so nothing here can pass through unchecked.
 *
 * The Bookings section shares its vocabulary with Storage and Moving's
 * booking lists — see docs/booking-list-contract.md and
 * lib/bookings/query.ts, which this extends exactly the way the API's own
 * `QueryEventBookingsDto extends BookingListQueryDto` does.
 *
 * BREAKING CHANGE carried over from the API: `from`/`to` used to bound the
 * *event window* (startDate/endDate) here. They now bound `createdAt`
 * (capture time) instead, matching Storage and Moving — the event-window
 * overlap filter moved to `startFrom`/`startTo` on the API, which this
 * screen does not yet expose (see docs/booking-list-contract.md's
 * "Why from/to mean createdAt" section). Existing bookmarks/links built
 * against the old from/to semantics will silently filter on the wrong
 * field, not error.
 *
 * The Items/Categories sections below have no booking-list equivalent and
 * stay a "copy, don't generify" file of their own — see
 * lib/properties/query.ts's `toSearchString` for that precedent
 * (PropertiesPagination is typed to PropertyQuery specifically).
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

export const EVENT_ITEM_STATUSES = ["draft", "published", "archived"] as const;
export const EVENT_ITEM_KINDS = ["package", "addon"] as const;

export type EventItemStatus = (typeof EVENT_ITEM_STATUSES)[number];
export type EventItemKind = (typeof EVENT_ITEM_KINDS)[number];

export interface EventItemQuery {
  page: number;
  limit: number;
  categoryId?: string;
  kind?: EventItemKind;
  status?: EventItemStatus;
  search?: string;
}

export interface EventCategoryQuery {
  isActive?: boolean;
}

const DEFAULT_PAGE = 1;
// The event-support items endpoint defaults to limit=12 server-side —
// NOT properties' 10. Copying that constant verbatim would silently emit
// `limit=12` into every URL once toSearchString "drops the default".
const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 100;

export function parseEventItemQuery(raw: RawSearchParams): EventItemQuery {
  const pageRaw = Number(first(raw.page));
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : DEFAULT_PAGE;

  const limitRaw = Number(first(raw.limit));
  const limit = Number.isFinite(limitRaw) && limitRaw >= 1 ? Math.min(Math.floor(limitRaw), MAX_LIMIT) : DEFAULT_LIMIT;

  const categoryIdRaw = first(raw.categoryId);
  const categoryId = categoryIdRaw && UUID_RE.test(categoryIdRaw) ? categoryIdRaw : undefined;

  const kindRaw = first(raw.kind);
  const kind = (EVENT_ITEM_KINDS as readonly string[]).includes(kindRaw ?? "") ? (kindRaw as EventItemKind) : undefined;

  const statusRaw = first(raw.status);
  const status = (EVENT_ITEM_STATUSES as readonly string[]).includes(statusRaw ?? "")
    ? (statusRaw as EventItemStatus)
    : undefined;

  const searchRaw = first(raw.search)?.trim();
  const search = searchRaw ? searchRaw : undefined;

  return { page, limit, categoryId, kind, status, search };
}

/**
 * Builds a "?..." query string from the current filters plus a patch,
 * dropping default/empty values. Used by the filter bar and pagination
 * links so navigating never drops the other active filters.
 */
export function toItemSearchString(query: EventItemQuery, patch: Partial<EventItemQuery>): string {
  const merged = { ...query, ...patch };
  const params = new URLSearchParams();
  if (merged.page && merged.page !== DEFAULT_PAGE) params.set("page", String(merged.page));
  if (merged.limit && merged.limit !== DEFAULT_LIMIT) params.set("limit", String(merged.limit));
  if (merged.categoryId) params.set("categoryId", merged.categoryId);
  if (merged.kind) params.set("kind", merged.kind);
  if (merged.status) params.set("status", merged.status);
  if (merged.search) params.set("search", merged.search);
  const s = params.toString();
  return s ? `?${s}` : "";
}

export function parseEventCategoryQuery(raw: RawSearchParams): EventCategoryQuery {
  const isActiveRaw = first(raw.isActive);
  const isActive = isActiveRaw === "true" ? true : isActiveRaw === "false" ? false : undefined;
  return { isActive };
}

export function toCategorySearchString(patch: Partial<EventCategoryQuery>): string {
  const params = new URLSearchParams();
  if (patch.isActive !== undefined) params.set("isActive", String(patch.isActive));
  const s = params.toString();
  return s ? `?${s}` : "";
}

// ─── Bookings ─────────────────────────────────────────────────────────────

export const EVENT_BOOKING_STATUSES = ["pending", "confirmed", "cancelled", "completed"] as const;
export type EventBookingStatus = (typeof EVENT_BOOKING_STATUSES)[number];

export const EVENT_BOOKING_SORTS = ["createdAt", "reference", "total", "startDate"] as const;
export type EventBookingSort = (typeof EVENT_BOOKING_SORTS)[number];

export interface EventBookingQuery extends BookingListQuery {
  status?: EventBookingStatus;
  sortBy: EventBookingSort;
}

export function parseEventBookingQuery(raw: RawSearchParams): EventBookingQuery {
  const base = parseBookingListQuery(raw);

  const status = parseEnumParam(first(raw.status), EVENT_BOOKING_STATUSES);
  const sortBy = parseEnumParam(first(raw.sortBy), EVENT_BOOKING_SORTS) ?? DEFAULT_BOOKING_SORT_BY;

  return { ...base, status, sortBy };
}

export function toBookingSearchString(query: EventBookingQuery, patch: Partial<EventBookingQuery>): string {
  const merged = { ...query, ...patch };
  const params = new URLSearchParams();
  if (merged.status) params.set("status", merged.status);
  appendBookingListParams(params, merged);
  if (merged.sortBy && merged.sortBy !== DEFAULT_BOOKING_SORT_BY) params.set("sortBy", merged.sortBy);
  const s = params.toString();
  return s ? `?${s}` : "";
}
