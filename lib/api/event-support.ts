import "server-only";
import { cache } from "react";
import { serverApi, unwrap, unwrapPaginated, type Paginated } from "@/lib/api/server-client";
import type { ApiResult } from "@/lib/api/errors";
import type { components } from "@/lib/api/schema";
import type { EventItemQuery, EventCategoryQuery, EventItemStatus, EventItemKind } from "@/lib/event-support/query";

/**
 * On openapi-fetch, unlike lib/api/media.ts: the event-support admin
 * routes carry real @ApiOkResponse decorators on the Nest side (verified
 * against the live schema — grep -c "event-support"
 * lib/api/schema.d.ts, then `npm run gen:api` against the deployed API),
 * so — unlike lib/api/properties.ts's admin/* routes, which still type
 * every response as `content?: never` — openapi-fetch gives real request
 * AND response typing here for free.
 *
 * Response types below are still hand-written rather than aliased
 * straight to components["schemas"][...]: it decouples this feature from
 * regen timing (a future schema change can't silently change these
 * shapes out from under the 15 components that import them) and matches
 * this repo's one convention (lib/api/properties.ts does the same, for
 * routes that have no choice). Every field has been checked against the
 * live schema's actual DTOs and matches exactly.
 */

export interface EventImage {
  url: string;
  srcset: string;
  alt: string | null;
  width: number;
  height: number;
}

export interface AdminEventCategory {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  descriptionText: string | null;
  image: EventImage | null;
  itemCount: number;
  isActive: boolean;
  sortOrder: number;
}

export interface AdminEventItem {
  id: string;
  categoryId: string;
  categorySlug: string;
  categoryName: string;
  name: string;
  slug: string;
  kind: EventItemKind;
  description: string | null;
  descriptionText: string | null;
  pricePerDay: number;
  stockQuantity: number;
  status: EventItemStatus;
  image: EventImage | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Categories ───────────────────────────────────────────────────────────

export async function listEventCategories(query: EventCategoryQuery = {}): Promise<ApiResult<AdminEventCategory[]>> {
  const api = await serverApi();
  const result = await api.GET("/admin/event-support/categories", { params: { query } });
  return unwrap<AdminEventCategory[]>(result);
}

/** cache() so generateMetadata() and the page share one request. */
export const getEventCategory = cache(async (id: string): Promise<ApiResult<AdminEventCategory>> => {
  const api = await serverApi();
  const result = await api.GET("/admin/event-support/categories/{id}", { params: { path: { id } } });
  return unwrap<AdminEventCategory>(result);
});

export interface EventCategoryInput {
  name?: string;
  slug?: string;
  /** Rich-text HTML, sanitized server-side. */
  description?: string;
  mediaAssetId?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export async function createEventCategory(input: EventCategoryInput): Promise<ApiResult<AdminEventCategory>> {
  const api = await serverApi();
  const result = await api.POST("/admin/event-support/categories", {
    body: input as unknown as components["schemas"]["CreateEventCategoryDto"],
  });
  return unwrap<AdminEventCategory>(result);
}

export async function updateEventCategory(id: string, patch: EventCategoryInput): Promise<ApiResult<AdminEventCategory>> {
  const api = await serverApi();
  const result = await api.PATCH("/admin/event-support/categories/{id}", {
    params: { path: { id } },
    body: patch as unknown as components["schemas"]["UpdateEventCategoryDto"],
  });
  return unwrap<AdminEventCategory>(result);
}

/** 409 while the category still has any items. */
export async function deleteEventCategory(id: string): Promise<ApiResult<void>> {
  const api = await serverApi();
  const result = await api.DELETE("/admin/event-support/categories/{id}", { params: { path: { id } } });
  return unwrap<void>(result);
}

// ─── Items ────────────────────────────────────────────────────────────────

export async function listEventItems(query: EventItemQuery): Promise<ApiResult<Paginated<AdminEventItem>>> {
  const api = await serverApi();
  const result = await api.GET("/admin/event-support/items", { params: { query } });
  return unwrapPaginated<AdminEventItem>(result);
}

export const getEventItem = cache(async (id: string): Promise<ApiResult<AdminEventItem>> => {
  const api = await serverApi();
  const result = await api.GET("/admin/event-support/items/{id}", { params: { path: { id } } });
  return unwrap<AdminEventItem>(result);
});

export interface EventItemCreateInput {
  categoryId: string;
  name: string;
  slug?: string;
  kind?: EventItemKind;
  description?: string;
  pricePerDay: number;
  stockQuantity: number;
  mediaAssetId?: string;
  sortOrder?: number;
}

/**
 * The live UpdateEventItemDto (verified against the regenerated schema)
 * DOES accept categoryId and slug — unlike properties, nothing here is
 * immutable after create. Deliberately excludes `status`: it isn't a
 * field on this DTO; it only changes through PATCH /items/:id/status
 * (see updateEventItemStatus below).
 */
export type EventItemUpdateInput = Partial<EventItemCreateInput>;

/** 201 draft — `status` is not a body field on create. */
export async function createEventItem(input: EventItemCreateInput): Promise<ApiResult<AdminEventItem>> {
  const api = await serverApi();
  const result = await api.POST("/admin/event-support/items", {
    body: input as unknown as components["schemas"]["CreateEventItemDto"],
  });
  return unwrap<AdminEventItem>(result);
}

/** 409 unless the item's current status is `draft`. */
export async function updateEventItem(id: string, patch: EventItemUpdateInput): Promise<ApiResult<AdminEventItem>> {
  const api = await serverApi();
  const result = await api.PATCH("/admin/event-support/items/{id}", {
    params: { path: { id } },
    body: patch as unknown as components["schemas"]["UpdateEventItemDto"],
  });
  return unwrap<AdminEventItem>(result);
}

/**
 * The only endpoint that changes status. Legal: draft→published|archived;
 * published→draft|archived; archived→draft only. Anything else 409s —
 * the UI is designed to never offer an illegal transition, so a 409 here
 * should only happen from a stale tab.
 */
export async function updateEventItemStatus(id: string, status: EventItemStatus): Promise<ApiResult<AdminEventItem>> {
  const api = await serverApi();
  const result = await api.PATCH("/admin/event-support/items/{id}/status", {
    params: { path: { id } },
    body: { status },
  });
  return unwrap<AdminEventItem>(result);
}

/** 409 if any booking (any status, ever) references it — archive instead. */
export async function deleteEventItem(id: string): Promise<ApiResult<void>> {
  const api = await serverApi();
  const result = await api.DELETE("/admin/event-support/items/{id}", { params: { path: { id } } });
  return unwrap<void>(result);
}
