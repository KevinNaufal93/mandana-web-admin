import { parseDateTimeLocal } from "@/lib/format";
import type { AdminEventItem } from "@/lib/api/event-support";

/**
 * Display-only mirror of the server's 8-hour-block pricing rule (mirroring
 * mandana-api's own event-pricing.ts computeLine() — see this plan's
 * companion doc, event-support-eight-hour-pricing-integration-plan.md),
 * used for the booking form's per-line badge and running estimate. NOT the
 * source of truth — the booking's real lineTotal/billingMode/unitPrice/
 * billableUnits are computed and snapshotted server-side on POST
 * /bookings, and the "Total final dihitung ulang oleh server" note in
 * BookingItemPicker stays for exactly that reason.
 *
 * There is no pricing policy left to mirror — the old threshold/rounding-
 * step/minimum-hours/day-plus-hourly model this file used to implement no
 * longer exists server-side. "8 hours" is a hard constant on both sides,
 * not a setting, so this never needs a settings row passed in.
 */

export interface LineEstimate {
  billingMode: "eight_hour" | "daily";
  unitLabel: "8 jam" | "hari";
  unitPrice: number;
  /** Always 1 under "eight_hour" billing (one fixed block); the whole-day
   *  count under "daily" — never fractional. */
  billableUnits: number;
  /** Calendar days held (endDate - startDate + 1) — matches the booking
   *  response's `days` field, meaningful even for an eight-hour-block line. */
  calendarDays: number;
  lineTotal: number;
}

const EIGHT_HOUR_BLOCK_MINUTES = 480; // matches mandana-api's event-pricing.ts constant exactly

function calendarDaysHeld(dropoff: Date, pickup: Date): number {
  const start = new Date(dropoff.getFullYear(), dropoff.getMonth(), dropoff.getDate());
  const end = new Date(pickup.getFullYear(), pickup.getMonth(), pickup.getDate());
  const diffDays = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  return diffDays + 1;
}

export function estimateLine(
  item: AdminEventItem,
  dropoffAt: string,
  pickupAt: string,
  quantity: number,
): LineEstimate | null {
  if (!dropoffAt || !pickupAt || !Number.isFinite(quantity) || quantity < 1) return null;

  const dropoff = parseDateTimeLocal(dropoffAt);
  const pickup = parseDateTimeLocal(pickupAt);
  const windowMs = pickup.getTime() - dropoff.getTime();
  if (!Number.isFinite(windowMs) || windowMs <= 0) return null;

  const windowMinutes = windowMs / 60_000;
  const calendarDays = calendarDaysHeld(dropoff, pickup);

  const canBillEightHour = item.supportsEightHour && item.eightHourRate != null && item.eightHourRate > 0;
  if (canBillEightHour && windowMinutes <= EIGHT_HOUR_BLOCK_MINUTES) {
    return {
      billingMode: "eight_hour",
      unitLabel: "8 jam",
      unitPrice: item.eightHourRate as number,
      billableUnits: 1,
      calendarDays,
      lineTotal: (item.eightHourRate as number) * quantity,
    };
  }

  const billableUnits = Math.max(1, Math.ceil(windowMinutes / 1440));
  return {
    billingMode: "daily",
    unitLabel: "hari",
    unitPrice: item.pricePerDay,
    billableUnits,
    calendarDays,
    lineTotal: item.pricePerDay * billableUnits * quantity,
  };
}
