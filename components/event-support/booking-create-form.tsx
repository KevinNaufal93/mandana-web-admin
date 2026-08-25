"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { BookingItemPicker, emptyBookingLine, type BookingLineDraft } from "@/components/event-support/booking-item-picker";
import { createEventBookingAction } from "@/app/actions/event-support-bookings";
import type { AdminEventItem } from "@/lib/api/event-support";
import type { EventBookingLineInput } from "@/lib/api/event-support-bookings";

function Field({
  label,
  htmlFor,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor}>{label}</Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

/** Every real booking is agreed over WhatsApp first — this form is where
 *  that agreement gets written down. */
export function BookingCreateForm({ items }: { items: AdminEventItem[] }) {
  const router = useRouter();
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<BookingLineDraft[]>([emptyBookingLine(items[0]?.id ?? "")]);

  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit() {
    setError(null);

    const name = customerName.trim();
    if (name.length < 2 || name.length > 255) {
      setError("Nama pelanggan wajib diisi (2–255 karakter).");
      return;
    }
    if (lines.length === 0) {
      setError("Tambahkan minimal satu item.");
      return;
    }

    const parsedLines: EventBookingLineInput[] = [];
    for (const line of lines) {
      if (!line.itemId) {
        setError("Setiap baris harus memilih item.");
        return;
      }
      const quantity = Number(line.quantity);
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1000) {
        setError("Jumlah harus berupa bilangan bulat 1–1000.");
        return;
      }
      if (!line.startDate) {
        setError("Setiap baris harus memiliki tanggal mulai.");
        return;
      }
      const days = Number(line.days);
      if (!Number.isInteger(days) || days < 1 || days > 365) {
        setError("Jumlah hari harus berupa bilangan bulat 1–365.");
        return;
      }
      parsedLines.push({ itemId: line.itemId, quantity, startDate: line.startDate, days });
    }

    startTransition(async () => {
      const result = await createEventBookingAction({
        customerName: name,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        eventLocation: eventLocation.trim() || undefined,
        notes: notes.trim() || undefined,
        items: parsedLines,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/event-support/bookings/${result.data.id}`);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
        <h2 className="text-sm font-semibold text-primary">Pelanggan</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nama" htmlFor="booking-customer-name">
            <Input id="booking-customer-name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} disabled={pending} />
          </Field>
          <Field label="Telepon" htmlFor="booking-phone">
            <Input id="booking-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+628…" disabled={pending} />
          </Field>
          <Field label="Email" htmlFor="booking-email">
            <Input id="booking-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={pending} />
          </Field>
          <Field label="Lokasi acara" htmlFor="booking-location">
            <Input id="booking-location" value={eventLocation} onChange={(e) => setEventLocation(e.target.value)} disabled={pending} />
          </Field>
        </div>
        <Field label="Catatan" htmlFor="booking-notes">
          <Textarea
            id="booking-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Detail yang disepakati lewat WhatsApp…"
            disabled={pending}
          />
        </Field>
      </div>

      <div className="rounded-lg border border-border p-4">
        <h2 className="mb-3 text-sm font-semibold text-primary">Item</h2>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada item yang terbit untuk dipesan.</p>
        ) : (
          <BookingItemPicker items={items} lines={lines} onChange={setLines} disabled={pending} />
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button variant="secondary" onClick={handleSubmit} disabled={pending || items.length === 0}>
          {pending ? "Menyimpan…" : "Catat pemesanan"}
        </Button>
        <Button variant="outlineSecondary" onClick={() => router.push("/event-support/bookings")} disabled={pending}>
          Batal
        </Button>
      </div>
    </div>
  );
}
