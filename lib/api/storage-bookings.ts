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
  /** Present only when durationUnit is "month"; null for a weekly booking. */
  durationMonths: number | null;
  endDate: string;
  durationUnit: "week" | "month";
  /** Billable count in durationUnit's unit. */
  duration: number;
  /** Rupiah — the rate actually applied per durationUnit. */
  unitRate: number;
  /** "bulan" | "minggu" */
  unitLabel: string;
  /** Rupiah — the reference monthly rate at booking time (not necessarily what was billed — see unitRate). */
  monthlyRate: number;
  /** Rupiah — rent only, before insurance */
  subtotal: number;
  /** Deprecated — the duration-discount tiers were removed. Always 0 on a
   *  booking created from now on; older bookings keep their real value. */
  discountAmount: number;
  /** Rupiah — customer-declared value of the goods being stored, at
   *  booking time. Set only on the "primary" booking of a multi-size cart
   *  (see primaryBookingReference/linkedBookings below) — null on a
   *  sibling booking, and on any booking from before this feature shipped. */
  declaredValue: number | null;
  /** Insurance rate (percent, may carry decimals, e.g. 0.5) applied to
   *  declaredValue — NOT to subtotal/rent — at booking time. */
  insurancePct: number;
  /** Rupiah — round(declaredValue * insurancePct / 100), or 0 when
   *  declaredValue is null. */
  insuranceAmount: number;
  /** Rupiah — subtotal + insuranceAmount */
  total: number;
  /** Reference of this cart's "primary" booking (see declaredValue) — null
   *  when THIS booking IS the primary. */
  primaryBookingReference: string | null;
  /** Every other booking from the same multi-size cart (the primary plus
   *  its siblings, minus this one) — empty when this booking was never
   *  part of one. Only populated on the single-booking endpoints (this
   *  getter and the four transitions below); listStorageBookings always
   *  returns [] here — see StorageBookingsService.findLinked()'s doc
   *  comment in mandana-api for why. */
  linkedBookings: Array<{
    id: string;
    reference: string;
    status: StorageBookingStatus;
    unitTypeName: string;
    quantity: number;
    isPrimary: boolean;
  }>;
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
