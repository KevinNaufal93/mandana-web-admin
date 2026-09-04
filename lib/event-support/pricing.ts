import { parseDateTimeLocal } from "@/lib/format";
import type { AdminEventItem } from "@/lib/api/event-support";
import type { AdminEventSupportSettings } from "@/lib/api/event-support-settings";

/**
 * Display-only mirror of the server's hourly-pricing rules (§6 of
 * event-support-admin-integration.md), used for the booking form's
 * per-line badge and running estimate. NOT the source of truth — the
 * booking's real lineTotal/billingMode/unitPrice/billableUnits are
 * computed and snapshotted server-side on POST /bookings, and the "Total
 * final dihitung ulang oleh server" note in BookingItemPicker stays for
 * exactly that reason. If this drifts from the server's actual rounding
 * edge cases, that's an acceptable cost for a live preview.
 */

export interface LineEstimate {
  billingMode: "hourly" | "daily";
  unitLabel: "jam" | "hari";
  unitPrice: number;
  billableUnits: number;
  /** Calendar days held (endDate - startDate + 1) — matches the booking
   *  response's `days` field, meaningful even for an hourly line. */
  calendarDays: number;
  extraHours: number | null;
  extraHoursTotal: number | null;
  lineTotal: number;
}

function calendarDaysHeld(dropoff: Date, pickup: Date): number {
  const start = new Date(dropoff.getFullYear(), dropoff.getMonth(), dropoff.getDate());
  const end = new Date(pickup.getFullYear(), pickup.getMonth(), pickup.getDate());
  const diffDays = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  return diffDays + 1;
}

/** Rounds hours up to the nearest `roundingUnitMinutes` step. */
function roundHoursUp(hours: number, roundingUnitMinutes: number): number {
  const stepHours = roundingUnitMinutes / 60;
  if (stepHours <= 0) return hours;
  return Math.ceil(hours / stepHours) * stepHours;
}

export function estimateLine(
  item: AdminEventItem,
  settings: AdminEventSupportSettings,
  dropoffAt: string,
  pickupAt: string,
  quantity: number,
): LineEstimate | null {
  if (!dropoffAt || !pickupAt || !Number.isFinite(quantity) || quantity < 1) return null;

  const dropoff = parseDateTimeLocal(dropoffAt);
  const pickup = parseDateTimeLocal(pickupAt);
  const windowMs = pickup.getTime() - dropoff.getTime();
  if (!Number.isFinite(windowMs) || windowMs <= 0) return null;

  const windowHours = windowMs / 3_600_000;
  const calendarDays = calendarDaysHeld(dropoff, pickup);

  const withinThreshold = settings.hourlyThresholdInclusive
    ? windowHours <= settings.hourlyThresholdHours
    : windowHours < settings.hourlyThresholdHours;
  const isHourly = item.supportsHourly && withinThreshold && item.hourlyRate != null && item.hourlyRate > 0;

  if (isHourly) {
    const hourlyRate = item.hourlyRate as number;
    const minimumHours = item.minimumHours ?? settings.defaultMinimumHours;
    const roundedHours = roundHoursUp(windowHours, settings.roundingUnitMinutes);
    const billableUnits = Math.max(roundedHours, minimumHours);
    let lineTotal = hourlyRate * billableUnits * quantity;
    if (settings.capHourlyAtDailyRate) {
      lineTotal = Math.min(lineTotal, item.pricePerDay * quantity);
    }
    return {
      billingMode: "hourly",
      unitLabel: "jam",
      unitPrice: hourlyRate,
      billableUnits,
      calendarDays,
      extraHours: null,
      extraHoursTotal: null,
      lineTotal,
    };
  }

  // Daily billing.
  if (settings.overThresholdMode === "day_plus_hourly" && item.supportsHourly && item.hourlyRate) {
    const fullDays = Math.max(1, Math.floor(windowHours / 24));
    const remainderHours = Math.max(0, windowHours - fullDays * 24);
    const extraHours = remainderHours > 0 ? roundHoursUp(remainderHours, settings.roundingUnitMinutes) : null;
    const extraHoursTotal = extraHours ? extraHours * item.hourlyRate * quantity : null;
    return {
      billingMode: "daily",
      unitLabel: "hari",
      unitPrice: item.pricePerDay,
      billableUnits: fullDays,
      calendarDays,
      extraHours,
      extraHoursTotal,
      lineTotal: item.pricePerDay * fullDays * quantity + (extraHoursTotal ?? 0),
    };
  }

  // "whole_days" (default) — ceils to the next full day.
  const billableUnits = Math.max(1, Math.ceil(windowHours / 24));
  return {
    billingMode: "daily",
    unitLabel: "hari",
    unitPrice: item.pricePerDay,
    billableUnits,
    calendarDays,
    extraHours: null,
    extraHoursTotal: null,
    lineTotal: item.pricePerDay * billableUnits * quantity,
  };
}
