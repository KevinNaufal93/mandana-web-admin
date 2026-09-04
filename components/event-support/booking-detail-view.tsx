"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { BookingStatusBadge } from "@/components/event-support/booking-status-badge";
import { BookingConflictPanel } from "@/components/event-support/booking-conflict-panel";
import { DetailCard, DetailRow } from "@/components/ui/detail-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  confirmEventBookingAction,
  cancelEventBookingAction,
  completeEventBookingAction,
} from "@/app/actions/event-support-bookings";
import { formatIDRFull, formatDateID, formatDateRangeID, formatDateTimeRangeID, toWaNumber } from "@/lib/format";
import type { AdminEventBooking } from "@/lib/api/event-support-bookings";

/** Bookings are never edited in place — no PATCH for fields exists.
 *  Everything below the header is read-only except the three transition
 *  buttons and their shared admin note. */
export function BookingDetailView({ booking: initialBooking }: { booking: AdminEventBooking }) {
  const [booking, setBooking] = useState(initialBooking);
  const [adminNote, setAdminNote] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);

  function runTransition(action: (id: string, input: { adminNote?: string }) => Promise<{ ok: true; data: AdminEventBooking } | { ok: false; error: string; conflict?: true }>) {
    setError(null);
    setConflict(false);
    startTransition(async () => {
      const result = await action(booking.id, { adminNote: adminNote.trim() || undefined });
      if (!result.ok) {
        setError(result.error);
        setConflict(Boolean(result.conflict));
        return;
      }
      setBooking(result.data);
      setAdminNote("");
    });
  }

  function handleCancel() {
    if (!window.confirm("Batalkan pemesanan ini? Tindakan ini tidak dapat dibatalkan.")) return;
    runTransition(cancelEventBookingAction);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-primary">{booking.reference}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{formatDateRangeID(booking.startDate, booking.endDate)}</p>
        </div>
        <BookingStatusBadge status={booking.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <DetailCard title="Item">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Jadwal</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                  <TableHead className="text-right">Tarif</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {booking.items.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell>
                      <Link href={`/event-support/items/${line.itemId}`} className="font-medium text-primary hover:underline">
                        {line.itemName}
                      </Link>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {line.dropoffAt && line.pickupAt
                        ? formatDateTimeRangeID(line.dropoffAt, line.pickupAt)
                        : formatDateRangeID(line.startDate, line.endDate)}
                      {" · "}
                      {line.days} hari
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">{line.quantity}</TableCell>
                    <TableCell className="whitespace-nowrap text-right text-sm text-muted-foreground">
                      <p>
                        {formatIDRFull(line.unitPrice)}/{line.unitLabel}
                      </p>
                      <p className="text-xs">
                        {line.billableUnits} {line.unitLabel}
                      </p>
                      {line.extraHours != null && (
                        <p className="text-xs">
                          +{line.extraHours} jam · {formatIDRFull(line.extraHoursTotal ?? 0)}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right font-medium text-primary">
                      {formatIDRFull(line.lineTotal)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="mt-3 flex flex-col items-end gap-1 text-sm">
              <div className="flex w-48 justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-primary">{formatIDRFull(booking.subtotal)}</span>
              </div>
              {/* discountAmount is always 0 today (no discount-tier support
                  yet) — showing "Diskon Rp 0" would advertise a feature
                  that doesn't exist. */}
              {booking.discountAmount > 0 && (
                <div className="flex w-48 justify-between">
                  <span className="text-muted-foreground">Diskon</span>
                  <span className="text-primary">-{formatIDRFull(booking.discountAmount)}</span>
                </div>
              )}
              <div className="flex w-48 justify-between font-semibold">
                <span className="text-primary">Total</span>
                <span className="text-primary">{formatIDRFull(booking.total)}</span>
              </div>
            </div>
          </DetailCard>
        </div>

        <div className="flex flex-col gap-6">
          <DetailCard title="Pelanggan">
            <p className="text-sm font-medium text-primary">{booking.customerName}</p>
            {booking.phone && (
              <div className="flex flex-wrap items-center gap-3">
                <a href={`tel:${booking.phone}`} className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                  <Phone className="size-3.5" />
                  {booking.phone}
                </a>
                <a
                  href={`https://wa.me/${toWaNumber(booking.phone)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                >
                  <MessageCircle className="size-3.5" />
                  WhatsApp
                </a>
              </div>
            )}
            {booking.email && (
              <a href={`mailto:${booking.email}`} className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                <Mail className="size-3.5" />
                {booking.email}
              </a>
            )}
          </DetailCard>

          <DetailCard title="Acara">
            {booking.eventLocation && (
              <p className="flex items-start gap-2 text-sm text-primary">
                <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span>{booking.eventLocation}</span>
              </p>
            )}
            <DetailRow
              label="Tanggal"
              value={
                booking.dropoffAt && booking.pickupAt
                  ? formatDateTimeRangeID(booking.dropoffAt, booking.pickupAt)
                  : formatDateRangeID(booking.startDate, booking.endDate)
              }
            />
            {booking.notes && (
              <div>
                <p className="text-xs text-muted-foreground">Catatan</p>
                <p className="mt-0.5 text-sm text-primary">{booking.notes}</p>
              </div>
            )}
          </DetailCard>

          {booking.adminNote && (
            <DetailCard title="Catatan admin">
              <p className="text-sm text-primary">{booking.adminNote}</p>
            </DetailCard>
          )}

          <DetailCard title="Metadata">
            <DetailRow label="Dibuat oleh" value={booking.createdByName ?? "—"} />
            <DetailRow label="Dibuat" value={formatDateID(booking.createdAt)} />
            {booking.confirmedAt && <DetailRow label="Dikonfirmasi" value={formatDateID(booking.confirmedAt)} />}
            {booking.confirmedByName && <DetailRow label="Dikonfirmasi oleh" value={booking.confirmedByName} />}
          </DetailCard>
        </div>
      </div>

      {(booking.status === "pending" || booking.status === "confirmed") && (
        <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
          <div>
            <label htmlFor="booking-admin-note" className="text-sm font-medium text-primary">
              Catatan admin (opsional)
            </label>
            <Textarea
              id="booking-admin-note"
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value.slice(0, 2000))}
              maxLength={2000}
              disabled={pending}
              className="mt-1.5"
            />
          </div>

          {error &&
            (conflict ? (
              <BookingConflictPanel
                message={error}
                booking={booking}
                onRetry={() => runTransition(confirmEventBookingAction)}
                onCancel={handleCancel}
                pending={pending}
              />
            ) : (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ))}

          <div className="flex flex-wrap items-center gap-2">
            {booking.status === "pending" && (
              <>
                <Button variant="secondary" onClick={() => runTransition(confirmEventBookingAction)} disabled={pending}>
                  Konfirmasi
                </Button>
                <Button variant="outlineSecondary" onClick={handleCancel} disabled={pending}>
                  Batalkan
                </Button>
              </>
            )}
            {booking.status === "confirmed" && (
              <>
                <Button variant="secondary" onClick={() => runTransition(completeEventBookingAction)} disabled={pending}>
                  Selesaikan
                </Button>
                <Button variant="outlineSecondary" onClick={handleCancel} disabled={pending}>
                  Batalkan
                </Button>
              </>
            )}
          </div>

          {booking.status === "pending" && (
            <p className="text-xs text-muted-foreground">Stok dikunci saat pemesanan dikonfirmasi.</p>
          )}
        </div>
      )}

      {(booking.status === "cancelled" || booking.status === "completed") && (
        <p className="text-sm text-muted-foreground">
          Pemesanan ini sudah {booking.status === "cancelled" ? "dibatalkan" : "selesai"}.
        </p>
      )}
    </div>
  );
}
