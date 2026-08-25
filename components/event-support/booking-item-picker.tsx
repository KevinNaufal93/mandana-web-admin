"use client";

import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatIDRFull } from "@/lib/format";
import type { AdminEventItem } from "@/lib/api/event-support";

export interface BookingLineDraft {
  /** Keyed by a fresh id, NOT itemId — the same item may legitimately
   *  appear on a booking twice (e.g. two separate date ranges). */
  key: string;
  itemId: string;
  quantity: string;
  startDate: string;
  days: string;
}

export function emptyBookingLine(defaultItemId: string): BookingLineDraft {
  return { key: crypto.randomUUID(), itemId: defaultItemId, quantity: "1", startDate: "", days: "1" };
}

const MAX_LINES = 50;

/**
 * The multi-line editor for POST /bookings. Fed a published-only catalog
 * via props — no client fetching (react-query is mounted app-wide but
 * used by nothing; this repo's state model is server props + actions).
 * If the catalog was truncated by the page's fetch limit, the caller
 * should render a note above this component; that's not this
 * component's job.
 */
export function BookingItemPicker({
  items,
  lines,
  onChange,
  disabled,
}: {
  items: AdminEventItem[];
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
    onChange([...lines, emptyBookingLine(items[0]?.id ?? "")]);
  }

  const estimatedTotal = lines.reduce((sum, l) => {
    const item = byId.get(l.itemId);
    const qty = Number(l.quantity);
    const days = Number(l.days);
    if (!item || !Number.isFinite(qty) || !Number.isFinite(days)) return sum;
    return sum + item.pricePerDay * qty * days;
  }, 0);

  return (
    <div className="flex flex-col gap-3">
      {lines.map((line) => (
        <div key={line.key} className="grid grid-cols-1 gap-2 rounded-lg border border-border p-3 sm:grid-cols-[1fr_5rem_9rem_5rem_auto] sm:items-end">
          <div>
            <Label htmlFor={`line-item-${line.key}`}>Item</Label>
            <Select value={line.itemId} onValueChange={(v) => updateLine(line.key, { itemId: v })}>
              <SelectTrigger id={`line-item-${line.key}`} className="mt-1.5 w-full" disabled={disabled}>
                <SelectValue placeholder="Pilih item" />
              </SelectTrigger>
              <SelectContent>
                {items.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.name} — {formatIDRFull(i.pricePerDay)}/hari
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
          <div>
            <Label htmlFor={`line-start-${line.key}`}>Mulai</Label>
            <Input
              id={`line-start-${line.key}`}
              type="date"
              value={line.startDate}
              onChange={(e) => updateLine(line.key, { startDate: e.target.value })}
              disabled={disabled}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor={`line-days-${line.key}`}>Hari</Label>
            <Input
              id={`line-days-${line.key}`}
              type="number"
              min={1}
              max={365}
              value={line.days}
              onChange={(e) => updateLine(line.key, { days: e.target.value })}
              disabled={disabled}
              className="mt-1.5"
            />
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
      ))}

      <Button type="button" variant="outlineSecondary" onClick={addLine} disabled={disabled || lines.length >= MAX_LINES} className="w-fit">
        <Plus className="size-4" />
        Tambah item
      </Button>

      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <p className="text-sm font-medium text-primary">Perkiraan total: {formatIDRFull(estimatedTotal)}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Total final dihitung ulang oleh server saat pemesanan disimpan.
        </p>
      </div>
    </div>
  );
}
