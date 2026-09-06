import "server-only";
import { StyleSheet, Text, View } from "@react-pdf/renderer";
import { pdfColors, pdfFontSize, pdfRadius, pdfRule, pdfSpace } from "@/lib/bookings/pdf/theme";
import { pdfFontFamily } from "@/lib/bookings/pdf/fonts";

/**
 * PDF analogues of components/ui/detail-card.tsx (Section ~ DetailCard,
 * Row ~ DetailRow) plus a handful of layout/print-specific primitives
 * (TwoColumn, LineItem, AmountRow, TotalsBlock, StatusPill) the web app
 * has no equivalent for. Every per-module document
 * (lib/<module>/pdf-document.tsx) is built out of these — no raw
 * View/Text styling should appear there.
 */

const styles = StyleSheet.create({
  section: {
    marginBottom: pdfSpace.lg,
  },
  sectionTitle: {
    fontSize: pdfFontSize.label,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: 0.75,
    color: pdfColors.mutedForeground,
    paddingBottom: pdfSpace.xs,
    marginBottom: pdfSpace.sm,
    borderBottomWidth: pdfRule.strong,
    borderBottomColor: pdfColors.ruleStrong,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: pdfSpace.xs,
  },
  rowLabel: {
    fontSize: pdfFontSize.body,
    color: pdfColors.mutedForeground,
  },
  rowValue: {
    fontSize: pdfFontSize.body,
    fontWeight: 500,
    color: pdfColors.primary,
    textAlign: "right",
  },
  emptyNote: {
    fontSize: pdfFontSize.body,
    color: pdfColors.mutedForeground,
  },
});

/** A titled block of content, matching DetailCard's role on the detail
 *  pages. wrap={false} by default so a short card (Pelanggan, Metadata,
 *  and so on) never splits across a page break; a caller with a
 *  genuinely long body (a multi-page item table) opts back into wrapping
 *  explicitly. */
export function Section({
  title,
  children,
  wrap = false,
}: {
  title: string;
  children: React.ReactNode;
  wrap?: boolean;
}) {
  return (
    <View wrap={wrap} style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View>{children}</View>
    </View>
  );
}

/** A label-left / value-right line, matching DetailRow. Value is kept to
 *  primitive types (not React.ReactNode) because every DetailRow call
 *  site on the web only ever passes a string or a number, never nested
 *  JSX. */
export function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

/** Two content blocks side by side (Pelanggan / Acara, Catatan admin /
 *  Metadata, and so on). Spacing between them is an explicit marginRight
 *  on the left column rather than a row gap, so this renders the same
 *  regardless of the installed react-pdf version's gap support. */
export function TwoColumn({
  left,
  right,
  gapWidth = pdfSpace.xl,
}: {
  left: React.ReactNode;
  right: React.ReactNode;
  gapWidth?: number;
}) {
  return (
    <View style={{ flexDirection: "row" }}>
      <View style={{ flex: 1, marginRight: gapWidth }}>{left}</View>
      <View style={{ flex: 1 }}>{right}</View>
    </View>
  );
}

/** A short line of muted text standing in for an omitted card, e.g.
 *  Moving printing "Belum ada data kontak." when a booking has no
 *  contact fields at all. Keeps that empty state a real sentence instead
 *  of a card that silently renders nothing. */
export function EmptyNote({ children }: { children: string }) {
  return <Text style={styles.emptyNote}>{children}</Text>;
}

type PillVariant = "default" | "secondary" | "accent" | "outline";

/**
 * Mirrors components/ui/badge.tsx variant-to-color mapping exactly
 * (default/secondary/accent/outline are the only variants any booking
 * status badge uses across all three modules), so a status reads the
 * same color on screen and on paper. Each module's own STATUS_VARIANT
 * map (e.g. components/moving/moving-booking-status-badge.tsx) decides
 * which variant a given status gets; this component only renders
 * whichever variant it is told.
 */
const PILL_VARIANT_STYLE: Record<PillVariant, { backgroundColor?: string; color: string; borderColor?: string }> = {
  default: { backgroundColor: pdfColors.primary, color: pdfColors.card },
  secondary: { backgroundColor: pdfColors.secondary, color: pdfColors.background },
  accent: { backgroundColor: pdfColors.accent, color: pdfColors.accentForeground },
  outline: { color: pdfColors.primary, borderColor: pdfColors.primary },
};

export function StatusPill({ label, variant }: { label: string; variant: PillVariant }) {
  const v = PILL_VARIANT_STYLE[variant];
  return (
    <View
      style={{
        alignSelf: "flex-start",
        borderRadius: pdfRadius.pill,
        paddingVertical: 3,
        paddingHorizontal: pdfSpace.sm,
        backgroundColor: v.backgroundColor,
        borderWidth: v.borderColor ? pdfRule.hairline : 0,
        borderColor: v.borderColor,
      }}
    >
      <Text style={{ fontSize: pdfFontSize.caption, fontWeight: 600, color: v.color }}>{label}</Text>
    </View>
  );
}

/** The document's own title block: booking reference (Gambetta, 20pt),
 *  an optional one-line subtitle, and a status pill pinned to the
 *  top-right — the PDF equivalent of each detail view's h1-plus-badge
 *  header row. */
export function DocumentHeading({
  reference,
  subtitle,
  status,
}: {
  reference: string;
  subtitle?: string;
  status: React.ReactNode;
}) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: pdfSpace.xl }}>
      <View>
        <Text style={{ fontFamily: pdfFontFamily.serif, fontSize: pdfFontSize.title, fontWeight: 500, color: pdfColors.primary }}>
          {reference}
        </Text>
        {subtitle && (
          <Text style={{ fontSize: pdfFontSize.body, color: pdfColors.mutedForeground, marginTop: 2 }}>{subtitle}</Text>
        )}
      </View>
      {status}
    </View>
  );
}

/** One line-item row: a name/amount header line plus any number of muted
 *  detail lines underneath — Event Support's per-item block (name plus
 *  lineTotal, then the date/quantity line, then the unit-price line). */
export function LineItem({
  name,
  amount,
  detailLines,
  divider = true,
}: {
  name: string;
  amount: string;
  detailLines: string[];
  divider?: boolean;
}) {
  return (
    <View
      style={{
        paddingVertical: pdfSpace.sm,
        borderBottomWidth: divider ? pdfRule.hairline : 0,
        borderBottomColor: pdfColors.rule,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ fontSize: pdfFontSize.body, fontWeight: 500, color: pdfColors.primary, flexShrink: 1, paddingRight: pdfSpace.sm }}>
          {name}
        </Text>
        <Text style={{ fontSize: pdfFontSize.body, fontWeight: 500, color: pdfColors.primary }}>{amount}</Text>
      </View>
      {detailLines.map((line, i) => (
        <Text key={i} style={{ fontSize: pdfFontSize.caption, color: pdfColors.mutedForeground, marginTop: 2 }}>
          {line}
        </Text>
      ))}
    </View>
  );
}

/** A single label/amount line with no detail lines underneath — Moving's
 *  per-leg and per-addon rows inside "Rincian Harga". */
export function AmountRow({ label, amount }: { label: string; amount: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: pdfSpace.xs }}>
      <Text style={{ fontSize: pdfFontSize.body, color: pdfColors.mutedForeground }}>{label}</Text>
      <Text style={{ fontSize: pdfFontSize.body, color: pdfColors.primary, fontWeight: 500 }}>{amount}</Text>
    </View>
  );
}

/** A route stop: a bold label ("Penjemputan" / "Tujuan 1") over a muted
 *  address (or lat/lng fallback) line — Moving's "Rute" card. */
export function RouteStop({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ marginBottom: pdfSpace.xs }}>
      <Text style={{ fontSize: pdfFontSize.body, fontWeight: 500, color: pdfColors.primary }}>{label}</Text>
      <Text style={{ fontSize: pdfFontSize.caption, color: pdfColors.mutedForeground, marginTop: 1 }}>{value}</Text>
    </View>
  );
}

/** Name / phone / email stack with no labels — matches the Pelanggan
 *  (Event Support, Storage) and Kontak (Moving) cards' own presentation
 *  on screen, which sets the name as a small heading and lists phone/
 *  email as plain lines rather than DetailRow label/value pairs. All
 *  three fields are optional since Moving's is the only module where a
 *  booking can genuinely have none of them (see hasContact on
 *  MovingBookingDetailView). */
export function ContactBlock({
  name,
  phone,
  email,
}: {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
}) {
  return (
    <View>
      {name && (
        <Text style={{ fontSize: pdfFontSize.body, fontWeight: 500, color: pdfColors.primary, marginBottom: pdfSpace.xs }}>
          {name}
        </Text>
      )}
      {phone && <Text style={{ fontSize: pdfFontSize.body, color: pdfColors.primary, marginBottom: 2 }}>{phone}</Text>}
      {email && <Text style={{ fontSize: pdfFontSize.body, color: pdfColors.primary }}>{email}</Text>}
    </View>
  );
}

/** A small caption label over a body-size paragraph — Event Support's
 *  "Catatan" line inside its "Acara" card (a labeled note nested inside a
 *  section that has other rows too, as opposed to Section itself, which
 *  is used when the note is the entire card, e.g. "Catatan admin"). */
export function Note({ label, children }: { label: string; children: string }) {
  return (
    <View style={{ marginTop: pdfSpace.xs }}>
      <Text style={{ fontSize: pdfFontSize.caption, color: pdfColors.mutedForeground }}>{label}</Text>
      <Text style={{ fontSize: pdfFontSize.body, color: pdfColors.primary, marginTop: 1 }}>{children}</Text>
    </View>
  );
}

export interface TotalsRow {
  label: string;
  /** Pre-formatted (formatIDRFull or similar) — this component stays
   *  presentation-only and never formats money itself. */
  value: string;
  /** Renders as the bold grand-total row with a rule above it. At most
   *  one row in a given TotalsBlock should set this. */
  emphasis?: boolean;
}

/** A right-aligned stack of label/value rows ending in (or containing) a
 *  bold total — Event Support's Subtotal/Diskon/Total, Storage's Tarif
 *  per unit/Subtotal/Diskon/Total, and Moving's longer Tarif dasar/Tarif
 *  jarak/Tarif tol/Total add-on/Total. Callers own their own row list
 *  (including which rows are conditional, e.g. "only when greater than
 *  zero") so this component stays dumb about booking shape. */
export function TotalsBlock({ rows, width = 220 }: { rows: TotalsRow[]; width?: number }) {
  return (
    <View style={{ alignSelf: "flex-end", width, marginTop: pdfSpace.sm }}>
      {rows.map((r, i) => (
        <View
          key={i}
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            paddingTop: r.emphasis ? pdfSpace.xs : 2,
            marginTop: r.emphasis ? pdfSpace.xs : 0,
            borderTopWidth: r.emphasis ? pdfRule.strong : 0,
            borderTopColor: pdfColors.ruleStrong,
          }}
        >
          <Text
            style={{
              fontSize: r.emphasis ? pdfFontSize.total : pdfFontSize.body,
              fontWeight: r.emphasis ? 600 : 400,
              color: r.emphasis ? pdfColors.primary : pdfColors.mutedForeground,
            }}
          >
            {r.label}
          </Text>
          <Text
            style={{
              fontSize: r.emphasis ? pdfFontSize.total : pdfFontSize.body,
              fontWeight: r.emphasis ? 600 : 500,
              color: pdfColors.primary,
            }}
          >
            {r.value}
          </Text>
        </View>
      ))}
    </View>
  );
}
