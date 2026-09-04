import "server-only";
import { cache } from "react";
import { serverApi, unwrap, unwrapPaginated, type Paginated } from "@/lib/api/server-client";
import type { ApiResult } from "@/lib/api/errors";
import type { components } from "@/lib/api/schema";
import type { EventBookingQuery, EventBookingStatus } from "@/lib/event-support/query";

/**
 * On openapi-fetch, same rationale as lib/api/event-support.ts — kept in
 * its own file so this phase's diff stays reviewable on its own.
 */

// ─── Response types (hand-written, matching the live schema's
// EventBookingAdminDto/EventBookingLineDto exactly — see
// lib/api/event-support.ts's header comment for why these aren't aliased
// straight to components["schemas"][...]) ─────────────────────────────────

export interface EventBookingLine {
  id: string;
  itemId: string;
  itemName: string;
  quantity: number;
  /** Naive local datetimes ("2026-03-01T09:00", no Z/offset). Null on
   *  bookings recorded before hourly pricing shipped. */
  dropoffAt: string | null;
  pickupAt: string | null;
  startDate: string;
  /** Calendar days held (endDate - startDate + 1) — an output, not an
   *  input. Stays meaningful for an hourly line too: a same-day rental
   *  still reads days: 1. */
  days: number;
  endDate: string;
  billingMode: "hourly" | "daily";
  /** Rupiah, integer */
  pricePerDay: number;
  /** Rupiah, integer — the rate actually applied (pricePerDay for a daily
   *  line, hourlyRate for an hourly one). */
  unitPrice: number;
  unitLabel: "jam" | "hari";
  billableUnits: number;
  /** Set only under the pricing policy's "day_plus_hourly" mode. */
  extraHours: number | null;
  /** Rupiah, integer */
  extraHoursTotal: number | null;
  lineTotal: number;
}

export interface AdminEventBooking {
  id: string;
  reference: string;
  status: EventBookingStatus;
  customerName: string;
  phone: string | null;
  email: string | null;
  eventLocation: string | null;
  notes: string | null;
  dropoffAt: string | null;
  pickupAt: string | null;
  startDate: string;
  endDate: string;
  items: EventBookingLine[];
  subtotal: number;
  /** Always 0 today — no discount-tier support yet, kept as a real field
   *  so one can be added later without a breaking change. Render only
   *  when > 0. */
  discountAmount: number;
  total: number;
  adminNote: string | null;
  createdByName: string | null;
  confirmedAt: string | null;
  confirmedByName: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function listEventBookings(query: EventBookingQuery): Promise<ApiResult<Paginated<AdminEventBooking>>> {
  const api = await serverApi();
  const result = await api.GET("/admin/event-support/bookings", { params: { query } });
  return unwrapPaginated<AdminEventBooking>(result);
}

export const getEventBooking = cache(async (id: string): Promise<ApiResult<AdminEventBooking>> => {
  const api = await serverApi();
  const result = await api.GET("/admin/event-support/bookings/{id}", { params: { path: { id } } });
  return unwrap<AdminEventBooking>(result);
});

export interface EventBookingLineInput {
  itemId: string;
  /** 1..1000 */
  quantity: number;
  /** Naive local datetime, no Z/offset — e.g. "2026-03-01T09:00", exactly
   *  what a <input type="datetime-local"> produces. Required by the live
   *  API; the old startDate+days shape 400s (removed here — see the
   *  event-support-admin-integration.md hourly-pricing rollout). */
  dropoffAt: string;
  pickupAt: string;
}

export interface EventBookingCreateInput {
  /** 2..255 */
  customerName: string;
  phone?: string;
  email?: string;
  eventLocation?: string;
  notes?: string;
  /** 1..50 lines. Each itemId must reference a currently PUBLISHED item
   *  or the request 404s naming which id(s) weren't found/published. */
  items: EventBookingLineInput[];
}

/** Starts `pending`. Does NOT reserve stock — see the availability model
 *  in the integration guide: only `confirm` claims it. */
export async function createEventBooking(input: EventBookingCreateInput): Promise<ApiResult<AdminEventBooking>> {
  const api = await serverApi();
  const result = await api.POST("/admin/event-support/bookings", {
    body: input as unknown as components["schemas"]["CreateEventBookingDto"],
  });
  return unwrap<AdminEventBooking>(result);
}

/** ≤2000 chars, never shown to the customer. `{}` is a valid body. */
export interface EventBookingTransitionInput {
  adminNote?: string;
}

/**
 * The only place stock is actually claimed — re-checks live availability
 * for every line inside a transaction and 409s if any line no longer has
 * enough stock (message names the item, remaining count, and dates).
 */
export async function confirmEventBooking(id: string, input: EventBookingTransitionInput = {}): Promise<ApiResult<AdminEventBooking>> {
  const api = await serverApi();
  const result = await api.PATCH("/admin/event-support/bookings/{id}/confirm", {
    params: { path: { id } },
    body: input,
  });
  return unwrap<AdminEventBooking>(result);
}

export async function cancelEventBooking(id: string, input: EventBookingTransitionInput = {}): Promise<ApiResult<AdminEventBooking>> {
  const api = await serverApi();
  const result = await api.PATCH("/admin/event-support/bookings/{id}/cancel", {
    params: { path: { id } },
    body: input,
  });
  return unwrap<AdminEventBooking>(result);
}

export async function completeEventBooking(id: string, input: EventBookingTransitionInput = {}): Promise<ApiResult<AdminEventBooking>> {
  const api = await serverApi();
  const result = await api.PATCH("/admin/event-support/bookings/{id}/complete", {
    params: { path: { id } },
    body: input,
  });
  return unwrap<AdminEventBooking>(result);
}
