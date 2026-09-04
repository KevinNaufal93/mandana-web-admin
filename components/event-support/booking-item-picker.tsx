"use client";

import { Plus, Trash2, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatIDRFull } from "@/lib/format";
import { estimateLine } from "@/lib/event-support/pricing";
import type { AdminEventItem } from "@/lib/api/event-support";
import type { AdminEventSupportSettings } from "@/lib/api/event-support-settings";

export interface BookingLineDraft {
  /** Keyed by a fresh id, NOT itemId — the same item may legitimately
   *  appear on a booking twice (e.g. two separate date ranges). */
  key: string;
  itemId: string;
  quantity: string;
  /** Naive local datetimes, "" until set. */
  dropoffAt: string;
  pickupAt: string;
  /** True while this line tracks the shared booking-level window. Turning
   *  it off snapshots the current values so the line can diverge. */
  useSharedWindow: boolean;
}

export function emptyBookingLine(defaultItemId: string, sharedDropoffAt: string, sharedPickupAt: string): BookingLineDraft {
  return {
    key: crypto.randomUUID(),
    itemId: defaultItemId,
    quantity: "1",
    dropoffAt: sharedDropoffAt,
    pickupAt: sharedPickupAt,
    useSharedWindow: true,
  };
}

const MAX_LINES = 50;

/**
 * The multi-line editor for POST /bookings. Fed a published-only catalog
 * via props — no client fetching (react-query is mounted app-wide but
 * used by nothing; this repo's state model is server props + actions).
 * If the catalog was truncated by the page's fetch limit, the caller
 * should render a note above this component; that's not this
 * component's job.
 *
 * Most real bookings are one event window applied to every line, so a
 * shared drop-off/pickup pair lives at the top and seeds every line;
 * a line can opt out ("Atur jadwal sendiri") for the rarer multi-range
 * booking.
 */
export function BookingItemPicker({
  items,
  settings,
  sharedDropoffAt,
  sharedPickupAt,
  onSharedWindowChange,
  lines,
  onChange,
  disabled,
}: {
  items: AdminEventItem[];
  settings: AdminEventSupportSettings | null;
  sharedDropoffAt: string;
  sharedPickupAt: string;
  onSharedWindowChange: (dropoffAt: string, pickupAt: string) => void;
  lines: BookingLineDraft[];
  onChange: (next: BookingLineDraft[]) => void;
  disabled?: boolean;
}) {
  const byId = new Map(items.map((i) => [i.id, i]));

  function updateLine(key: string, patch: Partial<BookingLineDraft>) {
    onChange(lines.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function removeLine(key: string) {
    onChange(lines.filter((l) => l.key !== key));
  }

  function addLine() {
    if (lines.length >= MAX_LINES) return;
    onChange([...lines, emptyBookingLine(items[0]?.id ?? "", sharedDropoffAt, sharedPickupAt)]);
  }

  function updateSharedWindow(patch: { dropoffAt?: string; pickupAt?: string }) {
    const nextDropoff = patch.dropoffAt ?? sharedDropoffAt;
    const nextPickup = patch.pickupAt ?? sharedPickupAt;
    onSharedWindowChange(nextDropoff, nextPickup);
    onChange(lines.map((l) => (l.useSharedWindow ? { ...l, dropoffAt: nextDropoff, pickupAt: nextPickup } : l)));
  }

  function toggleOwnSchedule(key: string, useOwn: boolean) {
    if (useOwn) {
      updateLine(key, { useSharedWindow: false });
    } else {
      updateLine(key, { useSharedWindow: true, dropoffAt: sharedDropoffAt, pickupAt: sharedPickupAt });
    }
  }

  const estimates = settings
    ? lines.map((l) => {
        const item = byId.get(l.itemId);
        const qty = Number(l.quantity);
        if (!item) return null;
        return estimateLine(item, settings, l.dropoffAt, l.pickupAt, qty);
      })
    : lines.map(() => null);

  const estimatedTotal = estimates.reduce((sum: number, e) => sum + (e?.lineTotal ?? 0), 0);
  const hasEstimate = estimates.some((e) => e !== null);

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-2 rounded-lg border border-border bg-muted/30 p-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="booking-shared-dropoff">Drop-off</Label>
          <Input
            id="booking-shared-dropoff"
            type="datetime-local"
            value={sharedDropoffAt}
            onChange={(e) => updateSharedWindow({ dropoffAt: e.target.value })}
            disabled={disabled}
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="booking-shared-pickup">Pickup</Label>
          <Input
            id="booking-shared-pickup"
            type="datetime-local"
            value={sharedPickupAt}
            onChange={(e) => updateSharedWindow({ pickupAt: e.target.value })}
            disabled={disabled}
            className="mt-1.5"
          />
        </div>
        <p className="text-xs text-muted-foreground sm:col-span-2">
          Berlaku untuk semua baris di bawah, kecuali yang mengatur jadwal sendiri.
        </p>
      </div>

      {lines.map((line, i) => {
        const item = byId.get(line.itemId);
        const estimate = estimates[i];
        return (
          <div key={line.key} className="rounded-lg border border-border p-3">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_5rem_auto_auto] sm:items-end">
              <div>
                <Label htmlFor={`line-item-${line.key}`}>Item</Label>
                <Select value={line.itemId} onValueChange={(v) => updateLine(line.key, { itemId: v })}>
                  <SelectTrigger id={`line-item-${line.key}`} className="mt-1.5 w-full" disabled={disabled}>
                    <SelectValue placeholder="Pilih item" />
                  </SelectTrigger>
                  <SelectContent>
                    {items.map((i2) => (
                      <SelectItem key={i2.id} value={i2.id}>
                        {i2.name} — {formatIDRFull(i2.supportsHourly && i2.hourlyRate != null ? i2.hourlyRate : i2.pricePerDay)}/
                        {i2.supportsHourly && i2.hourlyRate != null ? "jam" : "hari"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor={`line-qty-${line.key}`}>Jumlah</Label>
                <Input
                  id={`line-qty-${line.key}`}
                  type="number"
                  min={1}
                  max={1000}
                  value={line.quantity}
                  onChange={(e) => updateLine(line.key, { quantity: e.target.value })}
                  disabled={disabled}
                  className="mt-1.5"
                />
              </div>
              <div className="text-sm text-muted-foreground sm:text-right">
                {estimate ? (
                  <>
                    <p className="font-medium text-primary">
                      {estimate.billableUnits} {estimate.unitLabel}
                    </p>
                    <p>{formatIDRFull(estimate.lineTotal)}</p>
                  </>
                ) : (
                  <p>—</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeLine(line.key)}
                disabled={disabled}
                aria-label="Hapus baris"
                className="flex size-9 shrink-0 items-center justify-center rounded-md border border-destructive/30 text-destructive transition-colors hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 className="size-4" />
              </button>
            </div>

            <details className="mt-2 group" open={!line.useSharedWindow}>
              <summary
                className="flex w-fit cursor-pointer list-none items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                onClick={(e) => {
                  e.preventDefault();
                  toggleOwnSchedule(line.key, line.useSharedWindow);
                }}
              >
                <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" />
                Atur jadwal sendiri
              </summary>
              {!line.useSharedWindow && (
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div>
                    <Label htmlFor={`line-dropoff-${line.key}`}>Drop-off</Label>
                    <Input
                      id={`line-dropoff-${line.key}`}
                      type="datetime-local"
                      value={line.dropoffAt}
                      onChange={(e) => updateLine(line.key, { dropoffAt: e.target.value })}
                      disabled={disabled}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`line-pickup-${line.key}`}>Pickup</Label>
                    <Input
                      id={`line-pickup-${line.key}`}
                      type="datetime-local"
                      value={line.pickupAt}
                      onChange={(e) => updateLine(line.key, { pickupAt: e.target.value })}
                      disabled={disabled}
                      className="mt-1.5"
                    />
                  </div>
                </div>
              )}
            </details>

            {item?.supportsHourly && estimate?.extraHours != null && (
              <p className="mt-1 text-xs text-muted-foreground">
                +{estimate.extraHours} jam · {formatIDRFull(estimate.extraHoursTotal ?? 0)}
              </p>
            )}
          </div>
        );
      })}

      <Button type="button" variant="outlineSecondary" onClick={addLine} disabled={disabled || lines.length >= MAX_LINES} className="w-fit">
        <Plus className="size-4" />
        Tambah item
      </Button>

      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <p className="text-sm font-medium text-primary">
          Perkiraan total: {hasEstimate ? formatIDRFull(estimatedTotal) : "—"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Total final dihitung ulang oleh server saat pemesanan disimpan.
        </p>
      </div>
    </div>
  );
}
