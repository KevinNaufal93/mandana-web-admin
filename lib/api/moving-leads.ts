import "server-only";
import { cache } from "react";
import { serverApi, unwrapPaginated, unwrap, type Paginated } from "@/lib/api/server-client";
import type { ApiResult } from "@/lib/api/errors";
import type { components } from "@/lib/api/schema";
import type { MovingLeadQuery, MovingLeadStatus } from "@/lib/moving/query";

export type { Paginated };

/**
 * Leads are the one Moving resource that's paginated, and the one with no
 * admin-create and no delete (MovingLeadsAdminController only exposes GET
 * list, GET :id, PATCH :id — see moving-leads.controller.ts). A lead
 * reserves nothing, so PATCH has no transition rules and can never 409:
 * UpdateMovingLeadDto is `{ status?, adminNote? }`, both optional, no
 * legal-transition table.
 *
 * truckSlug/truckName and every price field (baseFare, legs[], addons[],
 * total, ...) are point-in-time snapshots taken when the lead was
 * captured — there is NO FK back to the truck-class/addon catalog. A lead
 * can reference a truck that's since been renamed or deleted; never build
 * a "view truck class" link off a lead row.
 */

export interface MovingLeadStop {
  /** 0-based route order. */
  stopIndex: number;
  address: string | null;
  lat: number;
  lng: number;
}

export interface MovingLeadAddonLine {
  slug: string;
  name: string;
  quantity: number;
  /** Rupiah */
  unitPrice: number;
  /** Rupiah */
  amount: number;
}

export interface MovingLeadLeg {
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

export interface AdminMovingLead {
  id: string;
  reference: string;
  status: MovingLeadStatus;
  truckSlug: string;
  truckName: string;
  pickupAddress: string | null;
  pickupLat: number;
  pickupLng: number;
  destinations: MovingLeadStop[];
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
  addons: MovingLeadAddonLine[];
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
  legs: MovingLeadLeg[];
  currency: string;
  /** Public capture form collects no contact fields today — expect null. */
  customerName: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  createdAt: string;
  adminNote: string | null;
  updatedAt: string;
}

export async function listMovingLeads(query: MovingLeadQuery): Promise<ApiResult<Paginated<AdminMovingLead>>> {
  const api = await serverApi();
  const result = await api.GET("/admin/moving/leads", { params: { query } });
  return unwrapPaginated<AdminMovingLead>(result);
}

/** cache() so generateMetadata() and the page share one request. */
export const getMovingLead = cache(async (id: string): Promise<ApiResult<AdminMovingLead>> => {
  const api = await serverApi();
  const result = await api.GET("/admin/moving/leads/{id}", { params: { path: { id } } });
  return unwrap<AdminMovingLead>(result);
});

export interface MovingLeadUpdateInput {
  status?: MovingLeadStatus;
  /** Internal note, not shown to the customer. Max 2000 chars server-side. */
  adminNote?: string;
}

/** One PATCH, not four transition functions like Storage/Event bookings —
 *  there's no state machine to drive, just free-form CRM triage. Can never
 *  409 (see this file's header comment). */
export async function updateMovingLead(id: string, patch: MovingLeadUpdateInput): Promise<ApiResult<AdminMovingLead>> {
  const api = await serverApi();
  const result = await api.PATCH("/admin/moving/leads/{id}", {
    params: { path: { id } },
    body: patch as unknown as components["schemas"]["UpdateMovingLeadDto"],
  });
  return unwrap<AdminMovingLead>(result);
}
