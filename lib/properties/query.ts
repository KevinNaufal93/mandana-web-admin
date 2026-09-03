/**
 * Whitelists and clamps the admin properties list's query params before
 * they reach the API. The global ValidationPipe runs with
 * forbidNonWhitelisted:true — an unrecognized key or a bad enum value is a
 * 400, not a silent ignore — so nothing here can pass through unchecked.
 * Mirrors QueryAdminPropertiesDto in mandana-api/src/modules/properties.
 */

export const PROPERTY_STATUSES = ["draft", "published", "archived"] as const;
export const LISTING_TYPES = ["sale", "rent", "new"] as const;

export type PropertyStatus = (typeof PROPERTY_STATUSES)[number];
export type ListingType = (typeof LISTING_TYPES)[number];

export interface PropertyQuery {
  page: number;
  limit: number;
  status?: PropertyStatus;
  listingType?: ListingType;
  search?: string;
  propertyTypeId?: string;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type RawSearchParams = { [key: string]: string | string[] | undefined };

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export function parsePropertyQuery(raw: RawSearchParams): PropertyQuery {
  const pageRaw = Number(first(raw.page));
  const page =
    Number.isFinite(pageRaw) && pageRaw >= 1
      ? Math.floor(pageRaw)
      : DEFAULT_PAGE;

  const limitRaw = Number(first(raw.limit));
  const limit =
    Number.isFinite(limitRaw) && limitRaw >= 1
      ? Math.min(Math.floor(limitRaw), MAX_LIMIT)
      : DEFAULT_LIMIT;

  const statusRaw = first(raw.status);
  const status = (PROPERTY_STATUSES as readonly string[]).includes(
    statusRaw ?? "",
  )
    ? (statusRaw as PropertyStatus)
    : undefined;

  const listingTypeRaw = first(raw.listingType);
  const listingType = (LISTING_TYPES as readonly string[]).includes(
    listingTypeRaw ?? "",
  )
    ? (listingTypeRaw as ListingType)
    : undefined;

  const searchRaw = first(raw.search)?.trim();
  const search = searchRaw ? searchRaw : undefined;

  const propertyTypeIdRaw = first(raw.propertyTypeId);
  const propertyTypeId =
    propertyTypeIdRaw && UUID_RE.test(propertyTypeIdRaw)
      ? propertyTypeIdRaw
      : undefined;

  return { page, limit, status, listingType, search, propertyTypeId };
}

/**
 * Builds a "?..." query string from the current filters plus a patch,
 * dropping default/empty values. Used by the filter bar and pagination
 * links so navigating never drops the other active filters.
 */
export function toSearchString(
  query: PropertyQuery,
  patch: Partial<PropertyQuery>,
): string {
  const merged = { ...query, ...patch };
  const params = new URLSearchParams();
  if (merged.page && merged.page !== DEFAULT_PAGE)
    params.set("page", String(merged.page));
  if (merged.limit && merged.limit !== DEFAULT_LIMIT)
    params.set("limit", String(merged.limit));
  if (merged.status) params.set("status", merged.status);
  if (merged.listingType) params.set("listingType", merged.listingType);
  if (merged.search) params.set("search", merged.search);
  if (merged.propertyTypeId)
    params.set("propertyTypeId", merged.propertyTypeId);
  const s = params.toString();
  return s ? `?${s}` : "";
}
