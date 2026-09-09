import "server-only";
import { Document, Text } from "@react-pdf/renderer";
import { BookingPdfPage } from "@/lib/bookings/pdf/chrome";
import {
  ContactBlock,
  DocumentHeading,
  LineItem,
  Note,
  Row,
  Section,
  StatusPill,
  TotalsBlock,
  TwoColumn,
  type TotalsRow,
} from "@/lib/bookings/pdf/primitives";
import { pdfColors, pdfFontSize } from "@/lib/bookings/pdf/theme";
import { formatDateID, formatDateRangeID, formatDateTimeRangeID, formatIDRFull } from "@/lib/format";
import { STATUS_LABEL, STATUS_VARIANT } from "@/components/event-support/booking-status-badge";
import { SOURCE_LABEL } from "@/lib/event-support/export";
import type { AdminEventBooking } from "@/lib/api/event-support-bookings";

/**
 * Mirrors components/event-support/booking-detail-view.tsx section for
 * section (Item, Pelanggan, Acara, Catatan admin, Metadata) — see
 * app/actions/booking-pdfs.ts for how this is rendered and returned.
 * Bookings are never edited in place, so unlike the web view this has no
 * interactive footer to omit: everything the screen shows read-only is
 * shown here too, including the internal fields (source, createdByName,
 * confirmedByName) — this document has no customer-facing mode.
 */
export function EventBookingPdfDocument({ booking }: { booking: AdminEventBooking }) {
  const totalsRows: TotalsRow[] = [{ label: "Subtotal", value: formatIDRFull(booking.subtotal) }];
  // discountAmount is always 0 today (no discount-tier support yet) — same
  // condition as the screen, so a PDF never advertises a feature that
  // does not exist by printing "Diskon Rp 0".
  if (booking.discountAmount > 0) {
    totalsRows.push({ label: "Diskon", value: `-${formatIDRFull(booking.discountAmount)}` });
  }
  totalsRows.push({ label: "Total", value: formatIDRFull(booking.total), emphasis: true });

  return (
    <Document title={`Pemesanan ${booking.reference}`}>
      <BookingPdfPage module="Mandana Living">
        <DocumentHeading
          reference={booking.reference}
          subtitle={formatDateRangeID(booking.startDate, booking.endDate)}
          status={<StatusPill label={STATUS_LABEL[booking.status]} variant={STATUS_VARIANT[booking.status]} />}
        />

        <Section title="Item" wrap>
          {booking.items.map((line, i) => {
            const detailLines = [
              `${
                line.dropoffAt && line.pickupAt
                  ? formatDateTimeRangeID(line.dropoffAt, line.pickupAt)
                  : formatDateRangeID(line.startDate, line.endDate)
              } · ${line.days} hari · ${line.quantity} unit`,
              line.unitLabel === "8 jam"
                ? `${formatIDRFull(line.unitPrice)}/8 jam`
                : `${formatIDRFull(line.unitPrice)}/hari × ${line.billableUnits} hari`,
            ];
            return (
              <LineItem
                key={line.id}
                name={line.itemName}
                amount={formatIDRFull(line.lineTotal)}
                detailLines={detailLines}
                divider={i < booking.items.length - 1}
              />
            );
          })}
          <TotalsBlock rows={totalsRows} />
        </Section>

        <TwoColumn
          left={
            <Section title="Pelanggan">
              <ContactBlock name={booking.customerName} phone={booking.phone} email={booking.email} />
            </Section>
          }
          right={
            <Section title="Acara">
              {booking.eventLocation && (
                <Text style={{ fontSize: pdfFontSize.body, color: pdfColors.primary, marginBottom: 2 }}>
                  {booking.eventLocation}
                </Text>
              )}
              <Row
                label="Tanggal"
                value={
                  booking.dropoffAt && booking.pickupAt
                    ? formatDateTimeRangeID(booking.dropoffAt, booking.pickupAt)
                    : formatDateRangeID(booking.startDate, booking.endDate)
                }
              />
              {booking.notes && <Note label="Catatan">{booking.notes}</Note>}
            </Section>
          }
        />

        {booking.adminNote ? (
          <TwoColumn
            left={
              <Section title="Catatan admin">
                <Text style={{ fontSize: pdfFontSize.body, color: pdfColors.primary }}>{booking.adminNote}</Text>
              </Section>
            }
            right={<MetadataSection booking={booking} />}
          />
        ) : (
          <MetadataSection booking={booking} />
        )}
      </BookingPdfPage>
    </Document>
  );
}

function MetadataSection({ booking }: { booking: AdminEventBooking }) {
  return (
    <Section title="Metadata">
      <Row label="Sumber" value={SOURCE_LABEL[booking.source]} />
      <Row label="Dibuat oleh" value={booking.createdByName ?? "—"} />
      <Row label="Dibuat" value={formatDateID(booking.createdAt)} />
      {booking.confirmedAt && <Row label="Dikonfirmasi" value={formatDateID(booking.confirmedAt)} />}
      {booking.confirmedByName && <Row label="Dikonfirmasi oleh" value={booking.confirmedByName} />}
    </Section>
  );
}
