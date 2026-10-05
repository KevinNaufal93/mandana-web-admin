/**
 * Client-side check for the WhatsApp number fields in the settings forms
 * (Mandana Move / Space / Living, and the General number under SEO).
 *
 * Mirrors WHATSAPP_NUMBER_PATTERN in mandana-api
 * (src/common/validation/whatsapp-number.ts) so a bad value is caught before
 * the round trip; the API still validates, so keep the two in step. It is
 * deliberately loose: staff type numbers however they write them ("+62
 * 812-3456-7890", "0812...", "(021) 5315 0000") and the public site
 * normalizes them for wa.me.
 */
export const WHATSAPP_NUMBER_PATTERN = /^\+?\(?[0-9][0-9\s().-]{6,30}$/;
export const WHATSAPP_NUMBER_MAX_LENGTH = 32;

/** Returns an Indonesian error message, or null when the value is fine.
 *  An empty value is fine: it clears the number. */
export function whatsappNumberError(raw: string): string | null {
  const value = raw.trim();
  if (value === "") return null;
  if (value.length > WHATSAPP_NUMBER_MAX_LENGTH) {
    return `Nomor WhatsApp maksimal ${WHATSAPP_NUMBER_MAX_LENGTH} karakter.`;
  }
  if (!WHATSAPP_NUMBER_PATTERN.test(value)) {
    return "Nomor WhatsApp hanya boleh berisi angka, spasi, dan tanda + ( ) - . — contoh: +6281234567890.";
  }
  return null;
}
