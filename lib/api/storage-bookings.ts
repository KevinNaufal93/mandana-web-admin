import "server-only";
import { cache } from "react";
import { serverApi, unwrap, unwrapPaginated, type Paginated } from "@/lib/api/server-client";
import type { ApiResult } from "@/lib/api/errors";
import type { StorageBookingQuery, StorageBookingStatus } from "@/lib/storage/query";

/**
 * Storage bookings have NO line items — one booking is one flat
 * facility × unit-type × quantity × date-range reservation, unlike Event
 * Support's booking (which has an items[] array). See
 * StorageBookingAdminDto in schema.d.ts. Response types hand-written for
 * the same decoupling reason as lib/api/storage.ts's header comment.
 */
export interface AdminStorageBooking {
  id: string;
  reference: string;
  status: StorageBookingStatus;
  customerName: string;
  email: string;
  phone: string | null;
  notes: string | null;
  facilitySlug: string;
  facilityName: string;
  unitTypeSlug: string;
  unitTypeName: string;
  quantity: number;
  startDate: string;
  durationMonths: number;
  endDate: string;
  /** Rupiah */
  monthlyRate: number;
  /** Rupiah */
  subtotal: number;
  /** Rupiah */
  discountAmount: number;
  /** Rupiah */
  total: number;
  adminNote: string | null;
  confirmedAt: string | null;
  confirmedByName: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function listStorageBookings(query: StorageBookingQuery): Promise<ApiResult<Paginated<AdminStorageBooking>>> {
  const api = await serverApi();
  const result = await api.GET("/admin/storage/bookings", { params: { query } });
  return unwrapPaginated<AdminStorageBooking>(result);
}

/** cache() so generateMetadata() and the page share one request. */
export const getStorageBooking = cache(async (id: string): Promise<ApiResult<AdminStorageBooking>> => {
  const api = await serverApi();
  const result = await api.GET("/admin/storage/bookings/{id}", { params: { path: { id } } });
  return unwrap<AdminStorageBooking>(result);
});

/** ≤2000 chars, never shown to the customer. `{}` is a valid body. */
export interface StorageBookingTransitionInput {
  adminNote?: string;
}

/**
 * The only transition that can 409 in the ordinary course of business —
 * re-checks live unit availability and allocates atomically. `quantity`
 * units must remain available for the whole date range or this 409s.
 */
export async function confirmStorageBooking(id: string, input: StorageBookingTransitionInput = {}): Promise<ApiResult<AdminStorageBooking>> {
  const api = await serverApi();
  const result = await api.PATCH("/admin/storage/bookings/{id}/confirm", {
    params: { path: { id } },
    body: input,
  });
  return unwrap<AdminStorageBooking>(result);
}

/** Only legal from `pending` — Event Support has no equivalent. */
export async function rejectStorageBooking(id: string, input: StorageBookingTransitionInput = {}): Promise<ApiResult<AdminStorageBooking>> {
  const api = await serverApi();
  const result = await api.PATCH("/admin/storage/bookings/{id}/reject", {
    params: { path: { id } },
    body: input,
  });
  return unwrap<AdminStorageBooking>(result);
}

/** Only legal from `confirmed` — releases the allocated unit(s). */
export async function cancelStorageBooking(id: string, input: StorageBookingTransitionInput = {}): Promise<ApiResult<AdminStorageBooking>> {
  const api = await serverApi();
  const result = await api.PATCH("/admin/storage/bookings/{id}/cancel", {
    params: { path: { id } },
    body: input,
  });
  return unwrap<AdminStorageBooking>(result);
}

/** Only legal from `confirmed` — releases the allocated unit(s). */
export async function completeStorageBooking(id: string, input: StorageBookingTransitionInput = {}): Promise<ApiResult<AdminStorageBooking>> {
  const api = await serverApi();
  const result = await api.PATCH("/admin/storage/bookings/{id}/complete", {
    params: { path: { id } },
    body: input,
  });
  return unwrap<AdminStorageBooking>(result);
}
