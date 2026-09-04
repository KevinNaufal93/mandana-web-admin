/**
 * Ported from mandana-web/lib/format.ts (separate repo — copied, not
 * imported, since the two apps don't share a package).
 */
export function formatIDRShort(v: number): string {
  const units: [number, string][] = [
    [1e12, "Triliun"],
    [1e9, "Miliar"],
    [1e6, "Juta"],
    [1e3, "Ribu"],
  ];
  for (const [factor, label] of units) {
    if (v >= factor) return `Rp ${(v / factor).toLocaleString("id-ID", { maximumFractionDigits: 1 })} ${label}`;
  }
  return `Rp ${v.toLocaleString("id-ID")}`;
}

export function composeLocation(p: {
  area?: string | null;
  city?: string | null;
  province?: string | null;
}): string {
  return [p.area, p.city, p.province].filter(Boolean).join(", ");
}

/**
 * The admin properties list returns raw TypeORM entities (see
 * lib/api/properties.ts), so Postgres `numeric` columns — price, areaSqm,
 * latitude, longitude — arrive as strings, not numbers. Coerce once here
 * rather than at every render site.
 */
export function toNum(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

/** Full grouped Rupiah, e.g. "Rp 5.000.000.000" — for exact price display. */
export function formatIDRFull(v: number): string {
  return `Rp ${Math.round(v).toLocaleString("id-ID")}`;
}

/** "Erwan Editor" → "EE". First + last word's initial, uppercased; falls
 *  back to "?" for an empty/whitespace-only name. Used wherever a person
 *  is represented without a photo (header menu, user photo card). */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase() || "?";
}

/** Normalizes a phone number for a `wa.me` link: "+628…"/"08…" → "628…". */
export function toWaNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  return digits;
}

/**
 * `new Date("2026-03-01")` parses a bare date-only string as UTC
 * midnight, which `toLocaleDateString` then renders as the PREVIOUS day
 * in any timezone west of UTC (all of Indonesia's). Build a local Date
 * from the components instead. Safe to call on a full ISO timestamp too
 * — it just reads the date-only prefix.
 */
export function parseDateOnly(v: string): Date {
  const [y, m, d] = v.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** "1 Maret 2026". Accepts a full ISO timestamp or a "YYYY-MM-DD" string. */
export function formatDateID(v: string): string {
  return parseDateOnly(v).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

/** "1 – 3 Maret 2026", collapsing the month/year when start and end share both. */
export function formatDateRangeID(start: string, end: string): string {
  const a = parseDateOnly(start);
  const b = parseDateOnly(end);
  if (a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()) {
    return formatDateID(start);
  }
  if (a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()) {
    const month = b.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
    return `${a.getDate()} – ${b.getDate()} ${month}`;
  }
  return `${formatDateID(start)} – ${formatDateID(end)}`;
}

/**
 * Parses a naive local datetime ("2026-03-01T09:00", no Z/offset) into
 * components by hand — same rationale as parseDateOnly above: this string
 * is deliberately timezone-free (Asia/Jakarta wall-clock time as agreed
 * over WhatsApp), and an explicit parse keeps that obvious rather than
 * relying on how a given engine treats a Z-less ISO string.
 */
export function parseDateTimeLocal(v: string): Date {
  const [datePart, timePart] = v.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [h, min] = (timePart ?? "00:00").split(":").map(Number);
  return new Date(y, m - 1, d, h, min);
}

/** "1 Maret 2026, 09.00" — accepts a naive "YYYY-MM-DDTHH:mm" datetime. */
export function formatDateTimeID(v: string): string {
  const date = parseDateTimeLocal(v);
  const datePart = date.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  const timePart = date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  return `${datePart}, ${timePart}`;
}

/** "1 Maret 2026, 09.00 – 17.00", collapsing the date when start and end share one day. */
export function formatDateTimeRangeID(start: string, end: string): string {
  const a = parseDateTimeLocal(start);
  const b = parseDateTimeLocal(end);
  const sameDay = a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const timeB = b.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  if (sameDay) {
    return `${formatDateTimeID(start)} – ${timeB}`;
  }
  return `${formatDateTimeID(start)} – ${formatDateTimeID(end)}`;
}
