/**
 * Shared query vocabulary for every admin "pemesanan" (booking) list —
 * Storage, Moving, Event Support. Mirrors the API's own split exactly:
 * `BookingListQueryDto` (src/common/dto/booking-list-query.dto.ts) hoists
 * only what's genuinely identical across all three modules and leaves
 * `status` and `sortBy` on each module's own subclass, because each is
 * backed by its own Postgres enum type. This file does the same —
 * `BookingListQuery` carries page/limit/search/from/to/sortOrder; each
 * `lib/<module>/query.ts` extends it with `status`, `sortBy`, and any
 * genuine module-only filters (e.g. Storage's facilitySlug/unitTypeSlug).
 *
 * `from`/`to` filter on `createdAt` (when the booking came in, in Jakarta
 * calendar days) on all three modules — see docs/booking-list-contract.md.
 * `startFrom`/`startTo` (the rental/event-window overlap filter Storage and
 * Event Support also accept) are intentionally not implemented here.
 *
 * See docs/booking-list-contract.md for the full contract this mirrors.
 */

export const DEFAULT_BOOKING_PAGE = 1;
// Contract-wide default — Storage used to default to 20 admin-side; that
// local override goes away now that the API's BookingListQueryDto (via
// PaginationQueryDto) defaults every "pemesanan" list to 12.
export const DEFAULT_BOOKING_LIMIT = 12;
export const MAX_BOOKING_LIMIT = 100;

export const SORT_ORDERS = ["asc", "desc"] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];
export const DEFAULT_BOOKING_SORT_ORDER: SortOrder = "desc";

// Every module's sortBy enum defaults to "createdAt" — coincidence in the
// sense that they're three separate Postgres enums, not a shared type, but
// the default value is the same string on all three (see each module's
// QueryXBookingsDto). Kept as a named constant so `toXSearchString` can
// drop it from the URL the same way it drops DEFAULT_BOOKING_SORT_ORDER.
export const DEFAULT_BOOKING_SORT_BY = "createdAt";

export type RawSearchParams = { [key: string]: string | string[] | undefined };

export function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Validates a raw string against an allow-list, same shape as every
 *  hand-rolled `(X_STATUSES as readonly string[]).includes(...)` check
 *  this replaces. Used for both `status` and `sortBy` on every module's
 *  query parser — an unrecognized value becomes `undefined` here, exactly
 *  like the API's `forbidNonWhitelisted` ValidationPipe rejects it as a
 *  400 rather than silently passing it through. */
export function parseEnumParam<T extends string>(v: string | undefined, allowed: readonly T[]): T | undefined {
  return v !== undefined && (allowed as readonly string[]).includes(v) ? (v as T) : undefined;
}

/** The half of every booking list query that's genuinely identical across
 *  Storage, Moving, and Event Support. `status` and `sortBy` are NOT here
 *  — each module declares those itself against its own enum. */
export interface BookingListQuery {
  page: number;
  limit: number;
  search?: string;
  /** Jakarta calendar day, inclusive — bounds createdAt (capture time). */
  from?: string;
  /** Jakarta calendar day, inclusive — bounds createdAt (capture time). */
  to?: string;
  sortOrder: SortOrder;
}

export function parseBookingListQuery(raw: RawSearchParams): BookingListQuery {
  const pageRaw = Number(first(raw.page));
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : DEFAULT_BOOKING_PAGE;

  const limitRaw = Number(first(raw.limit));
  const limit = Number.isFinite(limitRaw) && limitRaw >= 1 ? Math.min(Math.floor(limitRaw), MAX_BOOKING_LIMIT) : DEFAULT_BOOKING_LIMIT;

  const searchRaw = first(raw.search)?.trim();
  const search = searchRaw ? searchRaw : undefined;

  const fromRaw = first(raw.from);
  const from = fromRaw && DATE_ONLY_RE.test(fromRaw) ? fromRaw : undefined;

  const toRaw = first(raw.to);
  const to = toRaw && DATE_ONLY_RE.test(toRaw) ? toRaw : undefined;

  const sortOrder = parseEnumParam(first(raw.sortOrder), SORT_ORDERS) ?? DEFAULT_BOOKING_SORT_ORDER;

  return { page, limit, search, from, to, sortOrder };
}

/**
 * Writes the shared half of a merged booking query onto `params`. Each
 * module's `toXBookingSearchString` calls this and then sets its own
 * `status`/`sortBy`/module-extra keys on the same `URLSearchParams`
 * before calling `.toString()`.
 *
 * Drops values equal to the default so a page-1, default-sort URL stays
 * clean — same rule every `toXSearchString` in this codebase already
 * follows. `sortOrder` is compared against its own default independently
 * of `sortBy`: a default `sortBy` with `sortOrder=asc` still emits
 * `sortOrder=asc`.
 */
export function appendBookingListParams(params: URLSearchParams, merged: BookingListQuery): void {
  if (merged.page && merged.page !== DEFAULT_BOOKING_PAGE) params.set("page", String(merged.page));
  if (merged.limit && merged.limit !== DEFAULT_BOOKING_LIMIT) params.set("limit", String(merged.limit));
  if (merged.search) params.set("search", merged.search);
  if (merged.from) params.set("from", merged.from);
  if (merged.to) params.set("to", merged.to);
  if (merged.sortOrder && merged.sortOrder !== DEFAULT_BOOKING_SORT_ORDER) params.set("sortOrder", merged.sortOrder);
}
