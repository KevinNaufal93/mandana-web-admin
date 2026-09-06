import "server-only";
import { Document, Text, View } from "@react-pdf/renderer";
import { BookingPdfPage } from "@/lib/bookings/pdf/chrome";
import {
  AmountRow,
  ContactBlock,
  DocumentHeading,
  EmptyNote,
  Row,
  RouteStop,
  Section,
  StatusPill,
  TotalsBlock,
  TwoColumn,
  type TotalsRow,
} from "@/lib/bookings/pdf/primitives";
import { pdfColors, pdfFontSize, pdfSpace } from "@/lib/bookings/pdf/theme";
import { formatDateID, formatIDRFull } from "@/lib/format";
import { STATUS_LABEL, STATUS_VARIANT } from "@/components/moving/moving-booking-status-badge";
import type { AdminMovingBooking } from "@/lib/api/moving-bookings";

/** Same fallback the web view uses (see stopLabel in
 *  components/moving/moving-booking-detail-view.tsx) — duplicated here
 *  rather than imported since that file is a "use client" component and
 *  this one is server-only. */
function stopLabel(address: string | null, lat: number, lng: number): string {
  return address ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

/**
 * Mirrors components/moving/moving-booking-detail-view.tsx section for
 * section (Rute, Rincian Harga, Kontak, Catatan admin, Metadata) — see
 * app/actions/booking-pdfs.ts for how this is rendered and returned.
 *
 * truckName and every price field are point-in-time snapshots with no FK
 * back to the catalog (see the header comment in lib/api/moving-bookings.ts)
 * — same reason the web view has no "view truck class" link, this
 * document has none either.
 */
export function MovingBookingPdfDocument({ booking }: { booking: AdminMovingBooking }) {
  const hasContact = Boolean(booking.customerName || booking.phone || booking.email || booking.notes);

  // No "Subtotal" row here — the screen's own Rincian Harga totals block
  // has none either (Moving separates dasar/jarak/tol/add-on directly
  // into Total, with no intermediate subtotal label).
  const totalsRows: TotalsRow[] = [
    { label: "Tarif dasar", value: formatIDRFull(booking.baseFare) },
    { label: "Tarif jarak", value: formatIDRFull(booking.distanceFare) },
  ];
  if (booking.tollFare > 0) totalsRows.push({ label: "Tarif tol", value: formatIDRFull(booking.tollFare) });
  if (booking.addonsTotal > 0) totalsRows.push({ label: "Total add-on", value: formatIDRFull(booking.addonsTotal) });
  totalsRows.push({ label: "Total", value: formatIDRFull(booking.total), emphasis: true });

  return (
    <Document title={`Pemesanan ${booking.reference}`}>
      <BookingPdfPage module="Moving Support">
        <DocumentHeading
          reference={booking.reference}
          subtitle={`${booking.truckName} · ${formatDateID(booking.createdAt)}`}
          status={<StatusPill label={STATUS_LABEL[booking.status]} variant={STATUS_VARIANT[booking.status]} />}
        />

        <Section title="Rute">
          <RouteStop label="Penjemputan" value={stopLabel(booking.pickupAddress, booking.pickupLat, booking.pickupLng)} />
          {[...booking.destinations]
            .sort((a, b) => a.stopIndex - b.stopIndex)
            .map((stop, i) => (
              <RouteStop key={i} label={`Tujuan ${i + 1}`} value={stopLabel(stop.address, stop.lat, stop.lng)} />
            ))}

          <View style={{ marginTop: pdfSpace.xs }}>
            <Row label="Jarak" value={`${booking.distanceKm} km`} />
            <Row label="Km termasuk" value={`${booking.includedKm} km`} />
            <Row label="Km dikenakan biaya" value={`${booking.chargeableKm} km`} />
            <Row label="Pulang-pergi" value={booking.roundTrip ? "Ya" : "Tidak"} />
            <Row label="Rute tol" value={booking.tollRoute ? "Ya" : "Tidak"} />
            {booking.declaredValue != null && <Row label="Nilai barang dinyatakan" value={formatIDRFull(booking.declaredValue)} />}
          </View>
        </Section>

        <Section title="Rincian Harga" wrap>
          {booking.legs.map((leg, i) => (
            <AmountRow key={i} label={`Etape ${i + 1} · ${leg.chargeableKm} km dikenakan biaya`} amount={formatIDRFull(leg.subtotal)} />
          ))}
          {booking.addons.map((line) => (
            <AmountRow key={line.slug} label={`${line.name} × ${line.quantity}`} amount={formatIDRFull(line.amount)} />
          ))}

          <TotalsBlock rows={totalsRows} />

          <View style={{ alignSelf: "flex-end", width: 220, marginTop: pdfSpace.xs }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: pdfFontSize.caption, color: pdfColors.mutedForeground }}>Estimasi ditampilkan</Text>
              <Text style={{ fontSize: pdfFontSize.caption, color: pdfColors.mutedForeground }}>
                {formatIDRFull(booking.lowEstimate)} – {formatIDRFull(booking.highEstimate)}
              </Text>
            </View>
            {booking.minFareApplied && (
              <Text style={{ fontSize: pdfFontSize.caption, color: pdfColors.mutedForeground, marginTop: 2 }}>
                Tarif minimum diterapkan.
              </Text>
            )}
          </View>
        </Section>

        {booking.adminNote && (
          <Section title="Catatan admin">
            <Text style={{ fontSize: pdfFontSize.body, color: pdfColors.primary }}>{booking.adminNote}</Text>
          </Section>
        )}

        <TwoColumn
          left={
            <Section title="Kontak">
              {hasContact ? (
                <>
                  <ContactBlock name={booking.customerName} phone={booking.phone} email={booking.email} />
                  {booking.notes && (
                    <Text style={{ fontSize: pdfFontSize.body, color: pdfColors.mutedForeground, marginTop: pdfSpace.xs }}>
                      {booking.notes}
                    </Text>
                  )}
                </>
              ) : (
                <EmptyNote>Belum ada data kontak — form kalkulasi publik belum mengumpulkan detail pelanggan.</EmptyNote>
              )}
            </Section>
          }
          right={
            <Section title="Metadata">
              <Row label="Dibuat" value={formatDateID(booking.createdAt)} />
              {booking.confirmedAt && <Row label="Dikonfirmasi" value={formatDateID(booking.confirmedAt)} />}
              {booking.confirmedByName && <Row label="Dikonfirmasi oleh" value={booking.confirmedByName} />}
            </Section>
          }
        />
      </BookingPdfPage>
    </Document>
  );
}
