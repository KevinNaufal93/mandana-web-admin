"use client";

import { useState, useTransition } from "react";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { MovingBookingStatusBadge } from "@/components/moving/moving-booking-status-badge";
import { DownloadBookingPdfButton } from "@/components/bookings/download-booking-pdf-button";
import { DetailCard, DetailRow } from "@/components/ui/detail-card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  confirmMovingBookingAction,
  rejectMovingBookingAction,
  cancelMovingBookingAction,
  completeMovingBookingAction,
} from "@/app/actions/moving-bookings";
import type { BookingPdfResult } from "@/app/actions/booking-pdfs";
import { formatIDRFull, formatDateID, toWaNumber } from "@/lib/format";
import type { AdminMovingBooking } from "@/lib/api/moving-bookings";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";

function stopLabel(address: string | null, lat: number, lng: number): string {
  return address ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

/**
 * Same confirm/reject/cancel/complete transition footer as
 * StorageBookingDetailView — Moving bookings gained the same state
 * machine (see the header comment in lib/moving/query.ts). No conflict
 * panel, unlike Storage: Moving reserves no inventory, so a 409 here only
 * ever means the status already moved on (see the CONFLICT_COPY constant
 * in app/actions/moving-bookings.ts) — nothing to retry, just reload.
 *
 * truckSlug/truckName and every price field are point-in-time snapshots
 * with no FK back to the catalog (see the header comment in
 * lib/api/moving-bookings.ts) — deliberately no "view truck class" link
 * off this page.
 */
export function MovingBookingDetailView({
  booking: initialBooking,
  pdfAction,
}: {
  booking: AdminMovingBooking;
  pdfAction: (id: string) => Promise<BookingPdfResult>;
}) {
  const [booking, setBooking] = useState(initialBooking);
  const [adminNote, setAdminNote] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { confirm, dialog } = useConfirmDialog();

  const hasContact = Boolean(booking.customerName || booking.phone || booking.email || booking.notes);

  function runTransition(
    action: (id: string, input: { adminNote?: string }) => Promise<
      { ok: true; data: AdminMovingBooking } | { ok: false; error: string; conflict?: true }
    >,
  ) {
    setError(null);
    startTransition(async () => {
      const result = await action(booking.id, { adminNote: adminNote.trim() || undefined });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setBooking(result.data);
      setAdminNote("");
    });
  }

  async function handleReject() {
    const ok = await confirm({
      title: "Tolak pemesanan ini?",
      description: "Tindakan ini tidak dapat dibatalkan.",
      confirmLabel: "Tolak",
      variant: "destructive",
    });
    if (!ok) return;
    runTransition(rejectMovingBookingAction);
  }

  async function handleCancel() {
    const ok = await confirm({
      title: "Batalkan pemesanan ini?",
      description: "Tindakan ini tidak dapat dibatalkan.",
      confirmLabel: "Batalkan",
      variant: "destructive",
    });
    if (!ok) return;
    runTransition(cancelMovingBookingAction);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-primary">{booking.reference}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {booking.truckName} · {formatDateID(booking.createdAt)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <DownloadBookingPdfButton action={pdfAction} bookingId={booking.id} />
          <MovingBookingStatusBadge status={booking.status} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <DetailCard title="Rute">
            <div className="flex flex-col gap-2">
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                <div>
                  <p className="font-medium text-primary">Penjemputan</p>
                  <p className="text-muted-foreground">{stopLabel(booking.pickupAddress, booking.pickupLat, booking.pickupLng)}</p>
                </div>
              </div>
              {[...booking.destinations]
                .sort((a, b) => a.stopIndex - b.stopIndex)
                .map((stop, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-primary">Tujuan {i + 1}</p>
                      <p className="text-muted-foreground">{stopLabel(stop.address, stop.lat, stop.lng)}</p>
                    </div>
                  </div>
                ))}
            </div>

            <div className="mt-2 border-t border-border pt-3">
              <DetailRow label="Jarak" value={`${booking.distanceKm} km`} />
              <DetailRow label="Km termasuk" value={`${booking.includedKm} km`} />
              <DetailRow
                label="Km dikenakan biaya"
                value={
                  booking.chargeableSteps != null
                    ? `${booking.chargeableKm} km (${booking.chargeableSteps} × 500 m)`
                    : `${booking.chargeableKm} km`
                }
              />
              <DetailRow label="Pulang-pergi" value={booking.roundTrip ? "Ya" : "Tidak"} />
              <DetailRow label="Rute tol" value={booking.tollRoute ? "Ya" : "Tidak"} />
              {booking.declaredValue != null && (
                <DetailRow label="Nilai barang dinyatakan" value={formatIDRFull(booking.declaredValue)} />
              )}
            </div>
          </DetailCard>

          <DetailCard title="Rincian Harga">
            {booking.legs.length > 0 && (
              <div className="flex flex-col gap-1.5 border-b border-border pb-3">
                {booking.legs.map((leg, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Etape {i + 1} · {leg.chargeableKm} km dikenakan biaya
                      {leg.chargeableSteps != null && ` (${leg.chargeableSteps} × 500 m)`}
                    </span>
                    <span className="text-primary">{formatIDRFull(leg.subtotal)}</span>
                  </div>
                ))}
              </div>
            )}

            {booking.addons.length > 0 && (
              <div className="flex flex-col gap-1.5 border-b border-border py-3">
                {booking.addons.map((line) => (
                  <div key={line.slug} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {line.name} × {line.quantity}
                    </span>
                    <span className="text-primary">{formatIDRFull(line.amount)}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-3 flex flex-col items-end gap-1 text-sm">
              <div className="flex w-56 justify-between">
                <span className="text-muted-foreground">Tarif dasar</span>
                <span className="text-primary">{formatIDRFull(booking.baseFare)}</span>
              </div>
              <div className="flex w-56 justify-between">
                <span className="text-muted-foreground">Tarif jarak</span>
                <span className="text-primary">{formatIDRFull(booking.distanceFare)}</span>
              </div>
              {booking.tollFare > 0 && (
                <div className="flex w-56 justify-between">
                  <span className="text-muted-foreground">Tarif tol</span>
                  <span className="text-primary">{formatIDRFull(booking.tollFare)}</span>
                </div>
              )}
              {booking.addonsTotal > 0 && (
                <div className="flex w-56 justify-between">
                  <span className="text-muted-foreground">Total add-on</span>
                  <span className="text-primary">{formatIDRFull(booking.addonsTotal)}</span>
                </div>
              )}
              <div className="flex w-56 justify-between border-t border-border pt-1 font-semibold">
                <span className="text-primary">Total</span>
                <span className="text-primary">{formatIDRFull(booking.total)}</span>
              </div>
              <div className="flex w-56 justify-between text-xs text-muted-foreground">
                <span>Estimasi ditampilkan</span>
                <span>
                  {formatIDRFull(booking.lowEstimate)} – {formatIDRFull(booking.highEstimate)}
                </span>
              </div>
              {booking.minFareApplied && <p className="text-xs text-muted-foreground">Tarif minimum diterapkan.</p>}
            </div>
          </DetailCard>
        </div>

        <div className="flex flex-col gap-6">
          <DetailCard title="Kontak">
            {hasContact ? (
              <>
                {booking.customerName && <p className="text-sm font-medium text-primary">{booking.customerName}</p>}
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
                {booking.notes && <p className="mt-1 text-sm text-muted-foreground">{booking.notes}</p>}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Belum ada data kontak — form kalkulasi publik belum mengumpulkan detail pelanggan.
              </p>
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

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {booking.status === "pending" && (
              <>
                <Button variant="secondary" onClick={() => runTransition(confirmMovingBookingAction)} disabled={pending}>
                  Konfirmasi
                </Button>
                <Button variant="outlineSecondary" onClick={handleReject} disabled={pending}>
                  Tolak
                </Button>
              </>
            )}
            {booking.status === "confirmed" && (
              <>
                <Button variant="secondary" onClick={() => runTransition(completeMovingBookingAction)} disabled={pending}>
                  Selesaikan
                </Button>
                <Button variant="outlineSecondary" onClick={handleCancel} disabled={pending}>
                  Batalkan
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {(booking.status === "rejected" || booking.status === "cancelled" || booking.status === "completed") && (
        <p className="text-sm text-muted-foreground">
          Pemesanan ini sudah{" "}
          {booking.status === "rejected" ? "ditolak" : booking.status === "cancelled" ? "dibatalkan" : "selesai"}.
        </p>
      )}
      {dialog}
    </div>
  );
}
