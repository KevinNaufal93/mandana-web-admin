/**
 * Query vocabulary for the admin notification feed (GET /admin/notifications).
 * Deliberately NOT built on lib/bookings/query.ts's BookingListQuery -- this
 * list has no search box and no createdAt date-range filter, only
 * page/limit/sourceModule/filter (see QueryAdminNotificationsDto on the API
 * side) -- so it gets its own small parse/build pair rather than forcing an
 * ill-fitting extends.
 */
import { first, RawSearchParams } from "@/lib/bookings/query";

export const NOTIFICATION_SOURCE_MODULES = ["moving", "storage", "event_support"] as const;
export type NotificationSourceModule = (typeof NOTIFICATION_SOURCE_MODULES)[number];

export const NOTIFICATION_FILTERS = ["all", "unresolved"] as const;
export type NotificationFilter = (typeof NOTIFICATION_FILTERS)[number];

export const DEFAULT_NOTIFICATIONS_PAGE = 1;
export const DEFAULT_NOTIFICATIONS_LIMIT = 12;
export const MAX_NOTIFICATIONS_LIMIT = 100;
export const DEFAULT_NOTIFICATIONS_FILTER: NotificationFilter = "all";

export interface NotificationsQuery {
  page: number;
  limit: number;
  sourceModule?: NotificationSourceModule;
  filter: NotificationFilter;
}

function parseEnumParam<T extends string>(v: string | undefined, allowed: readonly T[]): T | undefined {
  return v !== undefined && (allowed as readonly string[]).includes(v) ? (v as T) : undefined;
}

export function parseNotificationsQuery(raw: RawSearchParams): NotificationsQuery {
  const pageRaw = Number(first(raw.page));
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : DEFAULT_NOTIFICATIONS_PAGE;

  const limitRaw = Number(first(raw.limit));
  const limit =
    Number.isFinite(limitRaw) && limitRaw >= 1
      ? Math.min(Math.floor(limitRaw), MAX_NOTIFICATIONS_LIMIT)
      : DEFAULT_NOTIFICATIONS_LIMIT;

  const sourceModule = parseEnumParam(first(raw.sourceModule), NOTIFICATION_SOURCE_MODULES);
  const filter = parseEnumParam(first(raw.filter), NOTIFICATION_FILTERS) ?? DEFAULT_NOTIFICATIONS_FILTER;

  return { page, limit, sourceModule, filter };
}

/** Drops values equal to the default so a page-1, filter=all URL stays
 *  clean -- same rule every toXSearchString in this codebase follows. */
export function toNotificationsSearchString(query: NotificationsQuery, patch: Partial<NotificationsQuery>): string {
  const merged = { ...query, ...patch };
  const params = new URLSearchParams();
  if (merged.page && merged.page !== DEFAULT_NOTIFICATIONS_PAGE) params.set("page", String(merged.page));
  if (merged.limit && merged.limit !== DEFAULT_NOTIFICATIONS_LIMIT) params.set("limit", String(merged.limit));
  if (merged.sourceModule) params.set("sourceModule", merged.sourceModule);
  if (merged.filter && merged.filter !== DEFAULT_NOTIFICATIONS_FILTER) params.set("filter", merged.filter);
  const s = params.toString();
  return s ? `?${s}` : "";
}
