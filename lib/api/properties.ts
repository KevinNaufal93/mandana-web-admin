import "server-only";
import { cache } from "react";
import { serverApi, unwrapPaginated, unwrap, type Paginated } from "@/lib/api/server-client";
import type { ApiResult } from "@/lib/api/errors";
import type { components } from "@/lib/api/schema";
import type { PropertyQuery, ListingType, PropertyStatus } from "@/lib/properties/query";

/**
 * Hand-written response types, same rationale as lib/api/auth-endpoints.ts:
 * the generated schema types every admin/* response as `content?: never`
 * (no @ApiOkResponse decorators on the Nest side yet), so openapi-fetch
 * gives us nothing to derive these from. Query params ARE typed by the
 * schema and go through openapi-fetch normally.
 *
 * adminFindAll (mandana-api/src/modules/properties/properties.service.ts)
 * maps rows through toPropertyResponse only — it does NOT run
 * PropertyMapper.toCard like the public list does. Two consequences:
 *  - Postgres `numeric` columns (price, areaSqm, latitude, longitude)
 *    serialize as strings, not numbers. Coerce with lib/format.ts's toNum.
 *  - There is no `cover` field, just the full `images[]` — derive the
 *    cover client-side (see coverOf below).
 */
export interface AdminPropertyImage {
  id: string;
  url: string;
  srcset?: string;
  alt: string | null;
  width?: number;
  height?: number;
  sortOrder: number;
  isCover: boolean;
}

export interface AdminPropertyRow {
  id: string;
  slug: string;
  title: string;
  listingType: ListingType;
  status: "draft" | "published" | "archived";
  price: string | number;
  currency: string;
  bedrooms: number | null;
  bathrooms: number | null;
  areaSqm: string | number | null;
  area: string | null;
  city: string | null;
  province: string | null;
  isFeatured: boolean;
  propertyType: { id: string; name: string; slug: string } | null;
  images: AdminPropertyImage[];
  createdAt: string;
  updatedAt: string;
}

export interface PropertyTypeOption {
  id: string;
  name: string;
  slug: string;
}

export interface AdminPropertyAmenity {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  category: string | null;
}

export interface AdminPropertyAgent {
  id: string;
  name: string;
  title: string | null;
  phone: string | null;
  whatsapp: string | null;
  photo: { url: string; srcset: string; alt: string | null; width: number; height: number } | null;
}

export type ConstructionStatus = "ready" | "under_construction";

/**
 * adminFindOne runs PropertyMapper.toDetail(property, {exact: true}) —
 * unlike adminFindAll above, this DOES go through toCard/toDetail, so
 * price/areaSqm/latitude/longitude are real numbers here, not the
 * numeric-as-string quirk the list has. `exact: true` also means the real
 * `address` and unfuzzed coordinates (locationPrecision: "exact"),
 * appropriate for an admin-only view.
 */
export interface AdminPropertyDetail {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  descriptionText: string | null;
  listingType: ListingType;
  /** Only meaningful when listingType is "new" — null otherwise. */
  handoverDate: string | null;
  /** Only meaningful when listingType is "new" — null otherwise. */
  constructionStatus: ConstructionStatus | null;
  status: "draft" | "published" | "archived";
  price: number | null;
  currency: string;
  bedrooms: number | null;
  bathrooms: number | null;
  areaSqm: number | null;
  address: string | null;
  area: string | null;
  city: string | null;
  province: string | null;
  latitude: number | null;
  longitude: number | null;
  isFeatured: boolean;
  locationPrecision: "exact";
  propertyType: { id: string; name: string; slug: string } | null;
  images: AdminPropertyImage[];
  amenities: AdminPropertyAmenity[];
  agent: AdminPropertyAgent | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * cache() so the detail page's generateMetadata() and the page component
 * itself — both calling this with the same id in the same render pass —
 * share one request instead of firing it twice. Same pattern as
 * getCurrentUser() in lib/auth/dal.ts.
 */
export const getAdminProperty = cache(
  async (id: string): Promise<ApiResult<AdminPropertyDetail>> => {
    const api = await serverApi();
    const result = await api.GET("/admin/properties/{id}", { params: { path: { id } } });
    return unwrap<AdminPropertyDetail>(result);
  },
);

export async function listAdminProperties(
  query: PropertyQuery,
): Promise<ApiResult<Paginated<AdminPropertyRow>>> {
  const api = await serverApi();
  const result = await api.GET("/admin/properties", { params: { query } });
  return unwrapPaginated<AdminPropertyRow>(result);
}

/** Public endpoint, but called through serverApi() so the page has one auth story. */
export async function listPropertyTypes(): Promise<ApiResult<PropertyTypeOption[]>> {
  const api = await serverApi();
  const result = await api.GET("/property-types");
  return unwrap<PropertyTypeOption[]>(result);
}

/** `images.find(cover) ?? images[0]` — the shared "what thumbnail do we show" rule. */
export function coverOf(row: Pick<AdminPropertyRow, "images">): AdminPropertyImage | null {
  const images = row.images ?? [];
  return images.find((img) => img.isCover) ?? images[0] ?? null;
}

/** Public endpoint, but called through serverApi() so the page has one auth story. */
export async function listAmenities(): Promise<ApiResult<AdminPropertyAmenity[]>> {
  const api = await serverApi();
  const result = await api.GET("/amenities");
  return unwrap<AdminPropertyAmenity[]>(result);
}

// ─── Mutations ──────────────────────────────────────────────────────────────

/**
 * One entry in AdminPropertyUpdateInput.images — the complete desired end
 * state of a single property image. Exactly one of id/mediaAssetId must be
 * present, and at most one entry across the array may set isCover: true;
 * both rules are enforced server-side (ValidPropertyImagesBatch) with a 400
 * on violation. An existing image whose id is absent from the array is
 * deleted — there is no separate delete op. Mirrors PropertyImageInputDto.
 */
export interface PropertyImageInputEntry {
  id?: string;
  mediaAssetId?: string;
  /** Full replacement, not a merge — omitting this resets alt to null. */
  alt?: string;
  sortOrder?: number;
  isCover?: boolean;
}

/**
 * Mirrors UpdatePropertyDto (PartialType<CreatePropertyDto>), but with
 * `| null` added on every nullable-in-the-database field — the generated
 * schema types those as `?: number`/`?: string` (optional, not nullable),
 * because OpenAPI's `?` can't express "send null to clear this", but
 * properties.service.ts's update() does accept null on every one of these
 * to clear the column (`dto.field !== undefined && {field: dto.field ?? null}`).
 * `undefined` (an omitted key) leaves the field untouched; `null` clears it.
 *
 * handoverDate/constructionStatus are the exception: the server 400s
 * (assertNewOnlyFields) if either is sent while the effective listingType
 * isn't "new", so callers must omit both keys entirely rather than send
 * null, unless listingType is (or is being set to) "new".
 */
export interface AdminPropertyUpdateInput {
  title?: string;
  description?: string | null;
  listingType?: ListingType;
  handoverDate?: string;
  constructionStatus?: ConstructionStatus;
  status?: PropertyStatus;
  price?: number;
  currency?: string;
  bedrooms?: number | null;
  bathrooms?: number | null;
  areaSqm?: number | null;
  address?: string | null;
  area?: string | null;
  city?: string | null;
  province?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isFeatured?: boolean;
  propertyTypeId?: string | null;
  agentId?: string;
  amenityIds?: string[];
  /** Omit to leave images untouched; [] deletes every existing image. */
  images?: PropertyImageInputEntry[];
}

/**
 * properties.service.ts's update() (mandana-api) returns the full detail
 * shape (PropertyMapper.toDetail — same as adminFindOne/GET :id), not the
 * raw saved entity, so callers don't need a follow-up fetch to see current
 * images/propertyType/agent.
 */
export async function updateProperty(
  id: string,
  patch: AdminPropertyUpdateInput,
): Promise<ApiResult<AdminPropertyDetail>> {
  const api = await serverApi();
  const result = await api.PATCH("/admin/properties/{id}", {
    params: { path: { id } },
    // The generated UpdatePropertyDto type is too narrow (see the
    // AdminPropertyUpdateInput doc comment above) — the real DTO's
    // @IsOptional() fields accept null at runtime.
    body: patch as unknown as components["schemas"]["UpdatePropertyDto"],
  });
  return unwrap<AdminPropertyDetail>(result);
}

/**
 * Mirrors CreatePropertyDto. title and price are the only two fields the
 * server requires; everything else (including slug, which is
 * auto-generated from title and deduped with a -2/-3 suffix on collision)
 * is optional. Note there is no `images` field here — CreatePropertyDto
 * doesn't accept one (the global ValidationPipe runs
 * forbidNonWhitelisted:true, so sending one would 400) — attach photos
 * with a follow-up updateProperty(id, { images }) call instead.
 */
export interface CreatePropertyInput {
  title: string;
  price: number;
  slug?: string;
  description?: string;
  listingType?: ListingType;
  handoverDate?: string;
  constructionStatus?: ConstructionStatus;
  status?: PropertyStatus;
  currency?: string;
  bedrooms?: number;
  bathrooms?: number;
  areaSqm?: number;
  address?: string;
  area?: string;
  city?: string;
  province?: string;
  latitude?: number;
  longitude?: number;
  isFeatured?: boolean;
  propertyTypeId?: string;
  agentId?: string;
  amenityIds?: string[];
}

/**
 * POST /admin/properties returns the raw saved entity (no @ApiOkResponse
 * on this route either — same content?:never gap as everywhere else in
 * this file), and unlike the PATCH response above it does NOT go through
 * PropertyMapper: no images/propertyType/agent relations loaded, and
 * price comes back as a Postgres numeric-as-string. Only `id` is used
 * here; the caller re-fetches via getAdminProperty for the real detail
 * shape once images (if any) have been attached.
 */
export async function createProperty(input: CreatePropertyInput): Promise<ApiResult<{ id: string }>> {
  const api = await serverApi();
  const result = await api.POST("/admin/properties", {
    body: input as unknown as components["schemas"]["CreatePropertyDto"],
  });
  return unwrap<{ id: string }>(result);
}
