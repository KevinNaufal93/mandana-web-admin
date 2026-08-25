import "server-only";
import { cache } from "react";
import { serverApi, unwrapPaginated, unwrap, type Paginated } from "@/lib/api/server-client";
import { verifySession } from "@/lib/auth/dal";
import { parseApiError, type ApiResult } from "@/lib/api/errors";
import type { components } from "@/lib/api/schema";
import type { PropertyQuery } from "@/lib/properties/query";

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
  listingType: "sale" | "rent";
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
  listingType: "sale" | "rent";
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
 * Mirrors UpdatePropertyDto (PartialType<CreatePropertyDto>), but with
 * `| null` added on every nullable-in-the-database field — the generated
 * schema types those as `?: number`/`?: string` (optional, not nullable),
 * because OpenAPI's `?` can't express "send null to clear this", but
 * properties.service.ts's update() does accept null on every one of these
 * to clear the column (`dto.field !== undefined && {field: dto.field ?? null}`).
 * `undefined` (an omitted key) leaves the field untouched; `null` clears it.
 */
export interface AdminPropertyUpdateInput {
  title?: string;
  description?: string | null;
  listingType?: "sale" | "rent";
  status?: "draft" | "published" | "archived";
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
  amenityIds?: string[];
}

export async function updateProperty(id: string, patch: AdminPropertyUpdateInput): Promise<ApiResult<void>> {
  const api = await serverApi();
  const result = await api.PATCH("/admin/properties/{id}", {
    params: { path: { id } },
    // The generated UpdatePropertyDto type is too narrow (see the
    // AdminPropertyUpdateInput doc comment above) — the real DTO's
    // @IsOptional() fields accept null at runtime.
    body: patch as unknown as components["schemas"]["UpdatePropertyDto"],
  });
  return unwrap<void>(result);
}

export interface AdminPropertyImageUpdateInput {
  alt?: string | null;
  sortOrder?: number;
  isCover?: boolean;
}

export async function updatePropertyImage(
  propertyId: string,
  imageId: string,
  patch: AdminPropertyImageUpdateInput,
): Promise<ApiResult<void>> {
  const api = await serverApi();
  const result = await api.PATCH("/admin/properties/{id}/images/{imageId}", {
    params: { path: { id: propertyId, imageId } },
    body: patch as unknown as components["schemas"]["UpdatePropertyImageDto"],
  });
  return unwrap<void>(result);
}

export async function deletePropertyImage(propertyId: string, imageId: string): Promise<ApiResult<void>> {
  const api = await serverApi();
  const result = await api.DELETE("/admin/properties/{id}/images/{imageId}", {
    params: { path: { id: propertyId, imageId } },
  });
  return unwrap<void>(result);
}

/**
 * Deliberately NOT on openapi-fetch, unlike every other function here: the
 * generated schema types this multipart body as `{file: string, ...}` (a
 * binary-format placeholder, not FormData), so a real FormData instance
 * fights the types. Raw fetch instead, same rationale as
 * lib/api/auth-endpoints.ts. `formData` is built by the caller (client
 * component) with `file`, and optionally `alt` / `sortOrder` / `isCover`.
 */
export async function addPropertyImage(propertyId: string, formData: FormData): Promise<ApiResult<void>> {
  const { accessToken } = await verifySession();
  const baseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "");

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/admin/properties/${propertyId}/images`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: formData,
      cache: "no-store",
    });
  } catch {
    return { ok: false, error: { kind: "network" } };
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) return { ok: false, error: parseApiError(response.status, body) };
  return { ok: true, data: undefined };
}
