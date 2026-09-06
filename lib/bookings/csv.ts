/**
 * CSV serialization primitives shared by every "pemesanan" export —
 * Storage, Moving, Event Support. Pure functions, no server-only: usable
 * from Server Actions (app/actions/booking-exports.ts) and independently
 * testable.
 *
 * Semicolon-delimited with a UTF-8 BOM, not comma-delimited RFC-4180 —
 * Excel on an Indonesian (or most European) locale uses ";" as its list
 * separator and silently dumps a comma-delimited file into one column.
 * The BOM is what makes Excel open the file as UTF-8 instead of the
 * system codepage, so Rupiah figures and accented names survive.
 */

export const CSV_DELIMITER = ";";
export const CSV_BOM = "\u{FEFF}"; // write the escape — never paste a literal invisible BOM into source
export const LIST_SEPARATOR = " | ";

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;
// A naive local datetime with no trailing Z/offset — Event Support's
// dropoffAt/pickupAt are deliberately timezone-free Asia/Jakarta
// wall-clock strings (see lib/format.ts's parseDateTimeLocal), so they
// must be sliced as text, never handed to `new Date()` — that would
// silently reinterpret them in whatever timezone the server process runs
// in and shift the displayed time.
const NAIVE_DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/;

/**
 * Quotes a field if it contains the delimiter, a quote, or a line break;
 * doubles any internal quote (standard CSV escaping). Also guards against
 * formula injection: Excel/Sheets evaluate a leading =, +, -, or @ as a
 * formula when the file is opened — a real concern here since notes,
 * addresses, and event locations can originate from a public,
 * unauthenticated booking form.
 */
export function csvField(value: string): string {
  let v = value;
  if (/^[=+\-@]/.test(v)) v = `'${v}`;
  if (/[;"\n\r]/.test(v)) v = `"${v.replace(/"/g, '""')}"`;
  return v;
}

/** Joins headers + rows into a complete CSV document, BOM-prefixed and
 *  CRLF-terminated (the RFC-4180 line ending — safest default for Excel
 *  on Windows, which is the deployment target here). */
export function toCsv(headers: string[], rows: string[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(csvField).join(CSV_DELIMITER));
  return CSV_BOM + lines.join("\r\n") + "\r\n";
}

function jakartaParts(iso: string): { date: string; time: string } {
  const [date, time] = new Date(iso).toLocaleString("sv-SE", { timeZone: "Asia/Jakarta" }).split(" ");
  return { date, time: time.slice(0, 5) };
}

/** "2026-09-07". Handles all three date shapes these DTOs actually carry:
 *  a bare calendar day (returned as-is — converting it through a timezone
 *  is the exact bug lib/format.ts's parseDateOnly exists to avoid), a
 *  naive local datetime (sliced as text, same reasoning), or a true
 *  timestamptz instant (converted to its Jakarta calendar day). */
export function csvDate(iso: string | null | undefined): string {
  if (!iso) return "";
  if (DATE_ONLY_RE.test(iso)) return iso;
  if (NAIVE_DATETIME_RE.test(iso)) return iso.slice(0, 10);
  return jakartaParts(iso).date;
}

/** "2026-09-07 03:05" — same shape-detection as csvDate, plus the time. */
export function csvDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  if (DATE_ONLY_RE.test(iso)) return iso;
  if (NAIVE_DATETIME_RE.test(iso)) return `${iso.slice(0, 10)} ${iso.slice(11, 16)}`;
  const { date, time } = jakartaParts(iso);
  return `${date} ${time}`;
}

/** Bare integer, never grouped/currency-formatted — so a spreadsheet's
 *  own SUM()/pivot on the column works without a strip-formatting step. */
export function csvInt(n: number | null | undefined): string {
  return n == null ? "" : String(Math.round(n));
}

export function csvBool(b: boolean | null | undefined): string {
  return b == null ? "" : b ? "Ya" : "Tidak";
}

/** Collapses a nested list (Moving's add-ons/destinations, Event
 *  Support's items) into one cell. Empty entries are dropped so a blank
 *  address doesn't leave a stray " |  | " in the middle of the string. */
export function csvList(parts: (string | null | undefined)[]): string {
  return parts.filter((p): p is string => Boolean(p && p.trim())).join(LIST_SEPARATOR);
}
