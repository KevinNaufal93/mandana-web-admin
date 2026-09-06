import "server-only";
import fs from "node:fs";
import path from "node:path";
import { Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { pdfColors, pdfFontSize, pdfPage } from "@/lib/bookings/pdf/theme";
import { pdfFontFamily, registerPdfFonts } from "@/lib/bookings/pdf/fonts";

/**
 * The three product names as they read on the marketing site's own
 * service cards (see the Mandana homepage's "Moving Support" / "Smart
 * Storage" / "Event Support" tiles) — kept as the literal module label so
 * the PDF uses the same product names a customer or admin already
 * recognizes, rather than this app's internal route segments.
 */
export type BookingPdfModule = "Event Support" | "Moving Support" | "Smart Storage";

const LOGO_PATH = path.join(process.cwd(), "public/images/logo/logo_text_white.png");
/** Intrinsic 633×132, measured directly from the PNG's IHDR chunk — react-pdf
 *  does not read image dimensions itself, so both width and height must be
 *  supplied explicitly or the wordmark renders stretched. */
const LOGO_RATIO = 633 / 132;
const LOGO_HEIGHT = 20;

let logoSrc: { data: Buffer; format: "png" } | null | undefined;

/** Reads the wordmark PNG once per warm instance. Returns null (rather
 *  than throwing) when the file is missing so a packaging/deploy mistake
 *  degrades the header to a text wordmark instead of failing the whole
 *  export — see the fallback in <Header> below. */
function loadLogoSrc(): { data: Buffer; format: "png" } | null {
  if (logoSrc === undefined) {
    try {
      logoSrc = { data: fs.readFileSync(LOGO_PATH), format: "png" as const };
    } catch {
      logoSrc = null;
    }
  }
  return logoSrc;
}

function formatGeneratedAt(): string {
  // A true instant (unlike the booking fields elsewhere in this feature,
  // which are naive local dates/datetimes parsed by hand) — Jakarta wall
  // clock is what belongs on a document footer, so this converts through
  // toLocaleDateString's timeZone option rather than lib/format.ts's
  // parseDateOnly (which assumes a bare "YYYY-MM-DD" or naive string).
  return new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });
}

const styles = StyleSheet.create({
  page: {
    paddingTop: pdfPage.paddingTop,
    paddingBottom: pdfPage.paddingBottom,
    paddingLeft: pdfPage.marginX,
    paddingRight: pdfPage.marginX,
    backgroundColor: pdfColors.white,
    fontFamily: pdfFontFamily.sans,
    fontSize: pdfFontSize.body,
    color: pdfColors.primary,
  },
  headerBand: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: pdfPage.headerHeight,
    paddingHorizontal: pdfPage.marginX,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: pdfColors.primary,
  },
  headerWordmarkFallback: {
    fontFamily: pdfFontFamily.serif,
    fontSize: pdfFontSize.title * 0.7,
    color: pdfColors.card,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  headerKicker: {
    fontSize: pdfFontSize.caption,
    fontWeight: 600,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: pdfColors.accent,
  },
  headerModule: {
    marginTop: 2,
    fontSize: pdfFontSize.body,
    fontWeight: 500,
    color: pdfColors.card,
  },
  footerBand: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: pdfPage.footerHeight,
    paddingHorizontal: pdfPage.marginX,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: pdfColors.footer,
  },
  footerText: {
    fontSize: pdfFontSize.caption,
    color: pdfColors.background,
  },
});

function Header({ module }: { module: BookingPdfModule }) {
  const src = loadLogoSrc();
  return (
    <View fixed style={styles.headerBand}>
      {src ? (
        // @react-pdf/renderer's Image is a PDF drawing primitive (no
        // accessibility tree, no `alt` prop in its type) — not next/image
        // or an HTML <img>.
        // eslint-disable-next-line jsx-a11y/alt-text
        <Image src={src} style={{ width: LOGO_HEIGHT * LOGO_RATIO, height: LOGO_HEIGHT }} />
      ) : (
        <Text style={styles.headerWordmarkFallback}>Mandana</Text>
      )}
      <View style={styles.headerRight}>
        <Text style={styles.headerKicker}>Rincian Pemesanan</Text>
        <Text style={styles.headerModule}>{module}</Text>
      </View>
    </View>
  );
}

function Footer() {
  return (
    <View fixed style={styles.footerBand}>
      <Text style={styles.footerText}>Mandana Property · mandana.id</Text>
      <Text style={styles.footerText}>Dicetak {formatGeneratedAt()}</Text>
      <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Halaman ${pageNumber} dari ${totalPages}`} />
    </View>
  );
}

/**
 * One A4 page with the brand header/footer bands already wired in —
 * every per-module document (lib/<module>/pdf-document.tsx) wraps its
 * content in exactly one of these inside a <Document>. Header and footer
 * are `fixed`, so react-pdf repeats them on every physical page a long
 * booking overflows onto; page content starts pdfPage.paddingTop below
 * the top of the page, clear of the header band.
 */
export function BookingPdfPage({ module, children }: { module: BookingPdfModule; children: React.ReactNode }) {
  registerPdfFonts();
  return (
    <Page size="A4" style={styles.page}>
      <Header module={module} />
      {children}
      <Footer />
    </Page>
  );
}
