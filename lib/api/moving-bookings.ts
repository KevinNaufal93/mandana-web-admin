import "server-only";
import { cache } from "react";
import { serverApi, unwrap, unwrapPaginated, type Paginated } from "@/lib/api/server-client";
import type { ApiResult } from "@/lib/api/errors";
import type { MovingBookingQuery, MovingBookingStatus } from "@/lib/moving/query";

/**
 * Moving's bookings resource used to be called "leads", with free-form CRM
 * triage (new/contacted/converted/lost) and no state machine — the API
 * renamed it and gave it the same pending/confirmed/rejected/cancelled/
 * completed lifecycle Storage bookings already had (see
 * moving-admin-integration.md). This file mirrors
 * lib/api/storage-bookings.ts's shape throughout for that reason — same
 * transition endpoints, same TransitionInput shape.
 *
 * truckSlug/truckName and every price field (baseFare, legs[], addons[],
 * total, ...) are point-in-time snapshots taken when the booking was
 * captured — there is NO FK back to the truck-class/addon catalog. A
 * booking can reference a truck that's since been renamed or deleted;
 * never build a "view truck class" link off a booking row.
 */

export interface MovingBookingStop {
  /** 0-based route order. */
  stopIndex: number;
  address: string | null;
  lat: number;
  lng: number;
}

export interface MovingBookingAddonLine {
  slug: string;
  name: string;
  quantity: number;
  /** Rupiah */
  unitPrice: number;
  /** Rupiah */
  amount: number;
}

export interface MovingBookingLeg {
  distanceKm: number;
  includedKm: number;
  chargeableKm: number;
  /** Rupiah */
  baseFare: number;
  /** Rupiah */
  distanceFare: number;
  /** Rupiah */
  subtotal: number;
}

export interface AdminMovingBooking {
  id: string;
  reference: string;
  status: MovingBookingStatus;
  truckSlug: string;
  truckName: string;
  pickupAddress: string | null;
  pickupLat: number;
  pickupLng: number;
  destinations: MovingBookingStop[];
  distanceKm: number;
  includedKm: number;
  chargeableKm: number;
  roundTrip: boolean;
  tollRoute: boolean;
  declaredValue: number | null;
  /** Rupiah */
  baseFare: number;
  /** Rupiah */
  distanceFare: number;
  /** Rupiah */
  travelSubtotal: number;
  /** Rupiah */
  tollFare: number;
  addons: MovingBookingAddonLine[];
  /** Rupiah */
  addonsTotal: number;
  /** Rupiah */
  subtotal: number;
  /** Rupiah */
  total: number;
  minFareApplied: boolean;
  /** Rupiah */
  lowEstimate: number;
  /** Rupiah */
  highEstimate: number;
  legs: MovingBookingLeg[];
  currency: string;
  /** Public capture form collects no contact fields today — expect null. */
  customerName: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  createdAt: string;
  adminNote: string | null;
  confirmedAt: string | null;
  confirmedByName: string | null;
  updatedAt: string;
}

export async function listMovingBookings(query: MovingBookingQuery): Promise<ApiResult<Paginated<AdminMovingBooking>>> {
  const api = await serverApi();
  const result = await api.GET("/admin/moving/bookings", { params: { query } });
  return unwrapPaginated<AdminMovingBooking>(result);
}

/** cache() so generateMetadata() and the page share one request. */
export const getMovingBooking = cache(async (id: string): Promise<ApiResult<AdminMovingBooking>> => {
  const api = await serverApi();
  const result = await api.GET("/admin/moving/bookings/{id}", { params: { path: { id } } });
  return unwrap<AdminMovingBooking>(result);
});

/** ≤2000 chars, never shown to the customer. `{}` is a valid body. */
export interface MovingBookingTransitionInput {
  adminNote?: string;
}

/** Note-only edit — status changes exclusively through confirm/reject/
 *  cancel/complete below (see moving-bookings.controller.ts). */
export async function updateMovingBookingNote(id: string, input: MovingBookingTransitionInput = {}): Promise<ApiResult<AdminMovingBooking>> {
  const api = await serverApi();
  const result = await api.PATCH("/admin/moving/bookings/{id}", {
    params: { path: { id } },
    body: input,
  });
  return unwrap<AdminMovingBooking>(result);
}

/**
 * Pure status writes — unlike Storage/Event Support, Moving reserves no
 * inventory, so confirm never allocates anything and can only 409 for the
 * generic "wrong starting status" reason every transition below shares
 * (e.g. two admins racing to act on the same booking).
 */
export async function confirmMovingBooking(id: string, input: MovingBookingTransitionInput = {}): Promise<ApiResult<AdminMovingBooking>> {
  const api = await serverApi();
  const result = await api.PATCH("/admin/moving/bookings/{id}/confirm", {
    params: { path: { id } },
    body: input,
  });
  return unwrap<AdminMovingBooking>(result);
}

/** Only legal from `pending`. */
export async function rejectMovingBooking(id: string, input: MovingBookingTransitionInput = {}): Promise<ApiResult<AdminMovingBooking>> {
  const api = await serverApi();
  const result = await api.PATCH("/admin/moving/bookings/{id}/reject", {
    params: { path: { id } },
    body: input,
  });
  return unwrap<AdminMovingBooking>(result);
}

/** Only legal from `confirmed`. */
export async function cancelMovingBooking(id: string, input: MovingBookingTransitionInput = {}): Promise<ApiResult<AdminMovingBooking>> {
  const api = await serverApi();
  const result = await api.PATCH("/admin/moving/bookings/{id}/cancel", {
    params: { path: { id } },
    body: input,
  });
  return unwrap<AdminMovingBooking>(result);
}

/** Only legal from `confirmed`. */
export async function completeMovingBooking(id: string, input: MovingBookingTransitionInput = {}): Promise<ApiResult<AdminMovingBooking>> {
  const api = await serverApi();
  const result = await api.PATCH("/admin/moving/bookings/{id}/complete", {
    params: { path: { id } },
    body: input,
  });
  return unwrap<AdminMovingBooking>(result);
}
