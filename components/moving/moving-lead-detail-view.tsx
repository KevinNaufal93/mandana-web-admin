"use client";

import { useState, useTransition } from "react";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { MovingLeadStatusBadge } from "@/components/moving/moving-lead-status-badge";
import { DetailCard, DetailRow } from "@/components/ui/detail-card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { updateMovingLeadAction } from "@/app/actions/moving-leads";
import { formatIDRFull, formatDateID, toWaNumber } from "@/lib/format";
import { MOVING_LEAD_STATUSES, type MovingLeadStatus } from "@/lib/moving/query";
import type { AdminMovingLead } from "@/lib/api/moving-leads";

const STATUS_LABEL: Record<MovingLeadStatus, string> = {
  new: "Baru",
  contacted: "Dihubungi",
  converted: "Dikonversi",
  lost: "Hilang",
};

function stopLabel(address: string | null, lat: number, lng: number): string {
  return address ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

/**
 * Read-only except the triage footer — a lead reserves nothing, so there's
 * no confirm/reject/cancel/complete flow and no conflict panel, unlike
 * StorageBookingDetailView. truckSlug/truckName and every price field are
 * point-in-time snapshots with no FK back to the catalog (see
 * lib/api/moving-leads.ts's header comment) — deliberately no "view truck
 * class" link off this page.
 */
export function MovingLeadDetailView({ lead: initialLead }: { lead: AdminMovingLead }) {
  const [lead, setLead] = useState(initialLead);
  const [status, setStatus] = useState<MovingLeadStatus>(initialLead.status);
  const [adminNote, setAdminNote] = useState(initialLead.adminNote ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const hasContact = Boolean(lead.customerName || lead.phone || lead.email || lead.notes);
  const dirty = status !== lead.status || adminNote !== (lead.adminNote ?? "");

  function handleSave() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateMovingLeadAction(lead.id, {
        status,
        adminNote: adminNote.trim() || undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setLead(result.data);
      setStatus(result.data.status);
      setAdminNote(result.data.adminNote ?? "");
      setSaved(true);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-primary">{lead.reference}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {lead.truckName} · {formatDateID(lead.createdAt)}
          </p>
        </div>
        <MovingLeadStatusBadge status={lead.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <DetailCard title="Rute">
            <div className="flex flex-col gap-2">
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                <div>
                  <p className="font-medium text-primary">Penjemputan</p>
                  <p className="text-muted-foreground">{stopLabel(lead.pickupAddress, lead.pickupLat, lead.pickupLng)}</p>
                </div>
              </div>
              {[...lead.destinations]
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
              <DetailRow label="Jarak" value={`${lead.distanceKm} km`} />
              <DetailRow label="Km termasuk" value={`${lead.includedKm} km`} />
              <DetailRow label="Km dikenakan biaya" value={`${lead.chargeableKm} km`} />
              <DetailRow label="Pulang-pergi" value={lead.roundTrip ? "Ya" : "Tidak"} />
              <DetailRow label="Rute tol" value={lead.tollRoute ? "Ya" : "Tidak"} />
              {lead.declaredValue != null && <DetailRow label="Nilai barang dinyatakan" value={formatIDRFull(lead.declaredValue)} />}
            </div>
          </DetailCard>

          <DetailCard title="Rincian Harga">
            {lead.legs.length > 0 && (
              <div className="flex flex-col gap-1.5 border-b border-border pb-3">
                {lead.legs.map((leg, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Etape {i + 1} · {leg.chargeableKm} km dikenakan biaya
                    </span>
                    <span className="text-primary">{formatIDRFull(leg.subtotal)}</span>
                  </div>
                ))}
              </div>
            )}

            {lead.addons.length > 0 && (
              <div className="flex flex-col gap-1.5 border-b border-border py-3">
                {lead.addons.map((line) => (
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
                <span className="text-primary">{formatIDRFull(lead.baseFare)}</span>
              </div>
              <div className="flex w-56 justify-between">
                <span className="text-muted-foreground">Tarif jarak</span>
                <span className="text-primary">{formatIDRFull(lead.distanceFare)}</span>
              </div>
              {lead.tollFare > 0 && (
                <div className="flex w-56 justify-between">
                  <span className="text-muted-foreground">Tarif tol</span>
                  <span className="text-primary">{formatIDRFull(lead.tollFare)}</span>
                </div>
              )}
              {lead.addonsTotal > 0 && (
                <div className="flex w-56 justify-between">
                  <span className="text-muted-foreground">Total add-on</span>
                  <span className="text-primary">{formatIDRFull(lead.addonsTotal)}</span>
                </div>
              )}
              <div className="flex w-56 justify-between border-t border-border pt-1 font-semibold">
                <span className="text-primary">Total</span>
                <span className="text-primary">{formatIDRFull(lead.total)}</span>
              </div>
              <div className="flex w-56 justify-between text-xs text-muted-foreground">
                <span>Estimasi ditampilkan</span>
                <span>
                  {formatIDRFull(lead.lowEstimate)} – {formatIDRFull(lead.highEstimate)}
                </span>
              </div>
              {lead.minFareApplied && <p className="text-xs text-muted-foreground">Tarif minimum diterapkan.</p>}
            </div>
          </DetailCard>
        </div>

        <div className="flex flex-col gap-6">
          <DetailCard title="Kontak">
            {hasContact ? (
              <>
                {lead.customerName && <p className="text-sm font-medium text-primary">{lead.customerName}</p>}
                {lead.phone && (
                  <div className="flex flex-wrap items-center gap-3">
                    <a href={`tel:${lead.phone}`} className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                      <Phone className="size-3.5" />
                      {lead.phone}
                    </a>
                    <a
                      href={`https://wa.me/${toWaNumber(lead.phone)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                    >
                      <MessageCircle className="size-3.5" />
                      WhatsApp
                    </a>
                  </div>
                )}
                {lead.email && (
                  <a href={`mailto:${lead.email}`} className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                    <Mail className="size-3.5" />
                    {lead.email}
                  </a>
                )}
                {lead.notes && <p className="mt-1 text-sm text-muted-foreground">{lead.notes}</p>}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Belum ada data kontak — form kalkulasi publik belum mengumpulkan detail pelanggan.
              </p>
            )}
          </DetailCard>

          <DetailCard title="Metadata">
            <DetailRow label="Dibuat" value={formatDateID(lead.createdAt)} />
            <DetailRow label="Diperbarui" value={formatDateID(lead.updatedAt)} />
          </DetailCard>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="lead-status" className="text-sm font-medium text-primary">
              Status
            </label>
            <div className="mt-1.5">
              <Select value={status} onValueChange={(v) => setStatus(v as MovingLeadStatus)}>
                <SelectTrigger id="lead-status" disabled={pending}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MOVING_LEAD_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="lead-admin-note" className="text-sm font-medium text-primary">
            Catatan admin (opsional)
          </label>
          <Textarea
            id="lead-admin-note"
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
        {saved && !pending && !error && (
          <p role="status" className="text-sm text-primary">
            Perubahan tersimpan.
          </p>
        )}

        <div>
          <Button variant="secondary" onClick={handleSave} disabled={pending || !dirty}>
            {pending ? "Menyimpan…" : "Simpan"}
          </Button>
        </div>
      </div>
    </div>
  );
}
