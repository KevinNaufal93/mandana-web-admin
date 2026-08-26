"use client";

import { useState, useTransition } from "react";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { StorageBookingStatusBadge } from "@/components/storage/storage-booking-status-badge";
import { StorageBookingConflictPanel } from "@/components/storage/storage-booking-conflict-panel";
import { DetailCard, DetailRow } from "@/components/ui/detail-card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  confirmStorageBookingAction,
  rejectStorageBookingAction,
  cancelStorageBookingAction,
  completeStorageBookingAction,
} from "@/app/actions/storage-bookings";
import { formatIDRFull, formatDateID, toWaNumber } from "@/lib/format";
import type { AdminStorageBooking } from "@/lib/api/storage-bookings";

/**
 * No line-item table — unlike Event Support's BookingDetailView, a
 * storage booking is one flat facility × unit-type × quantity × date
 * reservation (see lib/api/storage-bookings.ts's header comment), so the
 * "Item" card there becomes a single summary card here.
 *
 * Bookings are never edited in place — no PATCH for fields exists.
 * Everything below the header is read-only except the four transition
 * buttons and their shared admin note.
 */
export function StorageBookingDetailView({ booking: initialBooking }: { booking: AdminStorageBooking }) {
  const [booking, setBooking] = useState(initialBooking);
  const [adminNote, setAdminNote] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);

  function runTransition(
    action: (id: string, input: { adminNote?: string }) => Promise<
      { ok: true; data: AdminStorageBooking } | { ok: false; error: string; conflict?: true }
    >,
  ) {
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

  function handleReject() {
    if (!window.confirm("Tolak pemesanan ini? Tindakan ini tidak dapat dibatalkan.")) return;
    runTransition(rejectStorageBookingAction);
  }

  function handleCancel() {
    if (!window.confirm("Batalkan pemesanan ini? Tindakan ini tidak dapat dibatalkan.")) return;
    runTransition(cancelStorageBookingAction);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-primary">{booking.reference}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {booking.facilityName} · {booking.unitTypeName}
          </p>
        </div>
        <StorageBookingStatusBadge status={booking.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <DetailCard title="Pemesanan">
            <DetailRow label="Fasilitas" value={booking.facilityName} />
            <DetailRow label="Tipe unit" value={booking.unitTypeName} />
            <DetailRow label="Jumlah unit" value={booking.quantity} />
            <DetailRow label="Mulai" value={formatDateID(booking.startDate)} />
            <DetailRow label="Durasi" value={`${booking.durationMonths} bulan`} />
            <DetailRow label="Berakhir" value={formatDateID(booking.endDate)} />

            <div className="mt-3 flex flex-col items-end gap-1 border-t border-border pt-3 text-sm">
              <div className="flex w-56 justify-between">
                <span className="text-muted-foreground">Tarif / bulan</span>
                <span className="text-primary">{formatIDRFull(booking.monthlyRate)}</span>
              </div>
              <div className="flex w-56 justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-primary">{formatIDRFull(booking.subtotal)}</span>
              </div>
              {booking.discountAmount > 0 && (
                <div className="flex w-56 justify-between">
                  <span className="text-muted-foreground">Diskon</span>
                  <span className="text-primary">-{formatIDRFull(booking.discountAmount)}</span>
                </div>
              )}
              <div className="flex w-56 justify-between font-semibold">
                <span className="text-primary">Total</span>
                <span className="text-primary">{formatIDRFull(booking.total)}</span>
              </div>
            </div>
          </DetailCard>

          {booking.notes && (
            <DetailCard title="Catatan pelanggan">
              <p className="text-sm text-primary">{booking.notes}</p>
            </DetailCard>
          )}
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

          {booking.adminNote && (
            <DetailCard title="Catatan admin">
              <p className="text-sm text-primary">{booking.adminNote}</p>
            </DetailCard>
          )}

          <DetailCard title="Metadata">
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
              <StorageBookingConflictPanel
                message={error}
                booking={booking}
                onRetry={() => runTransition(confirmStorageBookingAction)}
                onReject={handleReject}
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
                <Button variant="secondary" onClick={() => runTransition(confirmStorageBookingAction)} disabled={pending}>
                  Konfirmasi
                </Button>
                <Button variant="outlineSecondary" onClick={handleReject} disabled={pending}>
                  Tolak
                </Button>
              </>
            )}
            {booking.status === "confirmed" && (
              <>
                <Button variant="secondary" onClick={() => runTransition(completeStorageBookingAction)} disabled={pending}>
                  Selesaikan
                </Button>
                <Button variant="outlineSecondary" onClick={handleCancel} disabled={pending}>
                  Batalkan
                </Button>
              </>
            )}
          </div>

          {booking.status === "pending" && (
            <p className="text-xs text-muted-foreground">Unit dialokasikan saat pemesanan dikonfirmasi.</p>
          )}
        </div>
      )}

      {(booking.status === "rejected" || booking.status === "cancelled" || booking.status === "completed") && (
        <p className="text-sm text-muted-foreground">
          Pemesanan ini sudah{" "}
          {booking.status === "rejected" ? "ditolak" : booking.status === "cancelled" ? "dibatalkan" : "selesai"}.
        </p>
      )}
    </div>
  );
}
