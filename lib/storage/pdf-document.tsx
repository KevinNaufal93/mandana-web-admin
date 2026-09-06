import "server-only";
import { Document, Text } from "@react-pdf/renderer";
import { BookingPdfPage } from "@/lib/bookings/pdf/chrome";
import {
  ContactBlock,
  DocumentHeading,
  Row,
  Section,
  StatusPill,
  TotalsBlock,
  TwoColumn,
  type TotalsRow,
} from "@/lib/bookings/pdf/primitives";
import { pdfColors, pdfFontSize } from "@/lib/bookings/pdf/theme";
import { formatDateID, formatIDRFull } from "@/lib/format";
import { STATUS_LABEL, STATUS_VARIANT } from "@/components/storage/storage-booking-status-badge";
import type { AdminStorageBooking } from "@/lib/api/storage-bookings";

/**
 * Mirrors components/storage/storage-booking-detail-view.tsx section for
 * section (Pemesanan, Catatan pelanggan, Pelanggan, Catatan admin,
 * Metadata) — see app/actions/booking-pdfs.ts for how this is rendered
 * and returned.
 *
 * No line-item table, unlike Event Support — a storage booking is one
 * flat facility × unit-type × quantity × date-range reservation (see the
 * header comment in lib/api/storage-bookings.ts), so "Item" on Event
 * Support's document becomes a single "Pemesanan" summary section here.
 */
export function StorageBookingPdfDocument({ booking }: { booking: AdminStorageBooking }) {
  const totalsRows: TotalsRow[] = [
    { label: `Tarif / ${booking.unitLabel}`, value: formatIDRFull(booking.unitRate) },
    { label: "Subtotal", value: formatIDRFull(booking.subtotal) },
  ];
  if (booking.discountAmount > 0) {
    totalsRows.push({ label: "Diskon", value: `-${formatIDRFull(booking.discountAmount)}` });
  }
  totalsRows.push({ label: "Total", value: formatIDRFull(booking.total), emphasis: true });

  return (
    <Document title={`Pemesanan ${booking.reference}`}>
      <BookingPdfPage module="Smart Storage">
        <DocumentHeading
          reference={booking.reference}
          subtitle={`${booking.facilityName} · ${booking.unitTypeName}`}
          status={<StatusPill label={STATUS_LABEL[booking.status]} variant={STATUS_VARIANT[booking.status]} />}
        />

        <Section title="Pemesanan">
          <Row label="Fasilitas" value={booking.facilityName} />
          <Row label="Tipe unit" value={booking.unitTypeName} />
          <Row label="Jumlah unit" value={booking.quantity} />
          <Row label="Mulai" value={formatDateID(booking.startDate)} />
          <Row label="Durasi" value={`${booking.duration} ${booking.unitLabel}`} />
          <Row label="Berakhir" value={formatDateID(booking.endDate)} />
          <TotalsBlock rows={totalsRows} />
        </Section>

        {booking.notes && (
          <Section title="Catatan pelanggan">
            <Text style={{ fontSize: pdfFontSize.body, color: pdfColors.primary }}>{booking.notes}</Text>
          </Section>
        )}

        {booking.adminNote && (
          <Section title="Catatan admin">
            <Text style={{ fontSize: pdfFontSize.body, color: pdfColors.primary }}>{booking.adminNote}</Text>
          </Section>
        )}

        <TwoColumn
          left={
            <Section title="Pelanggan">
              <ContactBlock name={booking.customerName} phone={booking.phone} email={booking.email} />
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
