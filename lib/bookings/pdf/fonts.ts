import "server-only";
import path from "node:path";
import { Font } from "@react-pdf/renderer";

const FONTS_DIR = path.join(process.cwd(), "lib/bookings/pdf/fonts");

export const pdfFontFamily = {
  sans: "Inter",
  serif: "Gambetta",
} as const;

/**
 * @react-pdf/renderer's font loader (fontkit under the hood) is reliable
 * with TTF/OTF and unreliable with WOFF2 — the app's existing
 * app/fonts/gambetta/*.woff2 and next/font/google Inter are both
 * unusable here, so this module vendors its own static-weight TTF/OTF
 * files under ./fonts instead of reusing either:
 *   - Inter-{Regular,Medium,SemiBold}.ttf (static instances — the Inter
 *     project's current Google Fonts release ships only a variable TTF,
 *     which fontkit renders at a single default instance regardless of
 *     the fontWeight it's registered under, so a variable file can't
 *     stand in for these three weights).
 *   - Gambetta-Medium.otf (static OTF, matching the weight the app's own
 *     variable Gambetta is dialed to for headings).
 * Do not point this module at the app/fonts woff2s.
 *
 * Font.register is a global, process-wide side effect. A warm serverless
 * instance can invoke a booking-pdf Server Action many times, so
 * `registered` guards against redundant re-registration — harmless on its
 * own, but re-registering also resets any font metrics fontkit already
 * cached for a render in flight, which is worth avoiding.
 */
let registered = false;

export function registerPdfFonts(): void {
  if (registered) return;
  registered = true;

  Font.register({
    family: pdfFontFamily.sans,
    fonts: [
      { src: path.join(FONTS_DIR, "Inter-Regular.ttf"), fontWeight: 400 },
      { src: path.join(FONTS_DIR, "Inter-Medium.ttf"), fontWeight: 500 },
      { src: path.join(FONTS_DIR, "Inter-SemiBold.ttf"), fontWeight: 600 },
    ],
  });

  Font.register({
    family: pdfFontFamily.serif,
    fonts: [{ src: path.join(FONTS_DIR, "Gambetta-Medium.otf"), fontWeight: 500 }],
  });

  // react-pdf hyphenates every wrapped word by default (100/600 penalty,
  // justified/ragged respectively) — fine for English, but it chops
  // Indonesian words mid-syllable in the narrower table cells below
  // ("pemesa-\nnan"). An identity callback disables hyphenation outright.
  Font.registerHyphenationCallback((word) => [word]);
}
