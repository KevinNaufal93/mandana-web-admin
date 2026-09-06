"use server";

import { toCsv } from "@/lib/bookings/csv";
import { MAX_BOOKING_LIMIT, type RawSearchParams } from "@/lib/bookings/query";
import { parseStorageBookingQuery, type StorageBookingQuery } from "@/lib/storage/query";
import { parseMovingBookingQuery, type MovingBookingQuery } from "@/lib/moving/query";
import { parseEventBookingQuery, type EventBookingQuery } from "@/lib/event-support/query";
import { listStorageBookings, type AdminStorageBooking } from "@/lib/api/storage-bookings";
import { listMovingBookings, type AdminMovingBooking } from "@/lib/api/moving-bookings";
import { listEventBookings, type AdminEventBooking } from "@/lib/api/event-support-bookings";
import { STORAGE_BOOKING_CSV_HEADERS, storageBookingCsvRow } from "@/lib/storage/export";
import { MOVING_BOOKING_CSV_HEADERS, movingBookingCsvRow } from "@/lib/moving/export";
import { EVENT_BOOKING_CSV_HEADERS, eventBookingCsvRow } from "@/lib/event-support/export";
import type { ApiError, ApiResult } from "@/lib/api/errors";
import type { Paginated } from "@/lib/api/server-client";
import { createLogger } from "@/lib/logger";

const log = createLogger("booking-exports");

/**
 * No `revalidatePath` anywhere below — same as app/actions/media.ts, an
 * export reads data and changes nothing.
 */
export type BookingExportResult =
  | { ok: true; data: { csv: string; filename: string; rowCount: number } }
  | { ok: false; error: string };

function errorMessage(error: ApiError): string {
  if (error.kind === "network") return "Tidak dapat terhubung ke server.";
  if (error.messages.length > 0) return error.messages.join(" ");
  return "Gagal mengekspor data.";
}

/** The client passes the exact "?..." string the page is currently
 *  rendered with (built by the same toXBookingSearchString the filter bar
 *  and pagination already use) — re-parsing it with the module's own
 *  parseXBookingQuery guarantees the exported rows match what's on screen
 *  exactly, and is inherently whitelisted: forbidNonWhitelisted-style
 *  validation, just client-side, so nothing unvalidated ever reaches the
 *  list endpoint. */
function parseSearchString(searchString: string): RawSearchParams {
  return Object.fromEntries(new URLSearchParams(searchString));
}

function exportFilename(modul: string): string {
  const stamp = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Jakarta" }).replace(/[-: ]/g, "");
  return `pemesanan-${modul}-${stamp.slice(0, 8)}-${stamp.slice(8, 12)}.csv`;
}

const MAX_EXPORT_ROWS = 5000;
// Pages beyond the first are fetched in small concurrent batches rather
// than one at a time — cuts wall-clock time on a multi-page export
// without opening dozens of simultaneous requests against the API.
const PAGE_CONCURRENCY = 5;

/**
 * Fetches every row matching `query`, looping pages as needed — the API
 * hard-caps `limit` at 100 (`@Max(100)` in pagination-query.dto.ts) with
 * no `all=true` escape hatch (an invented one would 400: the global
 * ValidationPipe runs forbidNonWhitelisted), so a full export has no
 * choice but to page.
 *
 * Refuses above MAX_EXPORT_ROWS rather than silently truncating — the
 * caller turns that into a message asking the admin to narrow the filter.
 *
 * This is a best-effort snapshot, not a transactionally consistent one: a
 * booking created between the first and a later page fetch can shift
 * offset-based pages, so a row could in principle be skipped or repeated.
 * Acceptable for an admin reporting export; real-world volume here is in
 * the low thousands per table (see the AddBookingListIndexes migration).
 */
async function fetchAllForExport<Q extends { page: number; limit: number }, T>(
  query: Q,
  list: (q: Q) => Promise<ApiResult<Paginated<T>>>,
): Promise<{ ok: true; items: T[] } | { ok: false; error: ApiError }> {
  const firstPage = await list({ ...query, page: 1, limit: MAX_BOOKING_LIMIT } as Q);
  if (!firstPage.ok) return { ok: false, error: firstPage.error };

  const { meta } = firstPage.data;
  if (meta.total > MAX_EXPORT_ROWS) {
    return {
      ok: false,
      error: {
        kind: "validation",
        messages: [
          `Data terlalu banyak untuk diekspor (${meta.total} baris). Persempit filter hingga di bawah ${MAX_EXPORT_ROWS} baris.`,
        ],
      },
    };
  }

  const items = [...firstPage.data.items];
  const remainingPages = Array.from({ length: Math.max(0, meta.totalPages - 1) }, (_, i) => i + 2);

  for (let i = 0; i < remainingPages.length; i += PAGE_CONCURRENCY) {
    const batch = remainingPages.slice(i, i + PAGE_CONCURRENCY);
    const results = await Promise.all(batch.map((page) => list({ ...query, page, limit: MAX_BOOKING_LIMIT } as Q)));
    for (const result of results) {
      if (!result.ok) return { ok: false, error: result.error };
      items.push(...result.data.items);
    }
  }

  return { ok: true, items };
}

export async function exportStorageBookingsAction(searchString: string): Promise<BookingExportResult> {
  const query = parseStorageBookingQuery(parseSearchString(searchString));
  const result = await fetchAllForExport<StorageBookingQuery, AdminStorageBooking>(query, listStorageBookings);
  if (!result.ok) {
    log.warn("Export storage bookings failed", { kind: result.error.kind });
    return { ok: false, error: errorMessage(result.error) };
  }
  return {
    ok: true,
    data: {
      csv: toCsv(STORAGE_BOOKING_CSV_HEADERS, result.items.map(storageBookingCsvRow)),
      filename: exportFilename("storage"),
      rowCount: result.items.length,
    },
  };
}

export async function exportMovingBookingsAction(searchString: string): Promise<BookingExportResult> {
  const query = parseMovingBookingQuery(parseSearchString(searchString));
  const result = await fetchAllForExport<MovingBookingQuery, AdminMovingBooking>(query, listMovingBookings);
  if (!result.ok) {
    log.warn("Export moving bookings failed", { kind: result.error.kind });
    return { ok: false, error: errorMessage(result.error) };
  }
  return {
    ok: true,
    data: {
      csv: toCsv(MOVING_BOOKING_CSV_HEADERS, result.items.map(movingBookingCsvRow)),
      filename: exportFilename("moving"),
      rowCount: result.items.length,
    },
  };
}

export async function exportEventBookingsAction(searchString: string): Promise<BookingExportResult> {
  const query = parseEventBookingQuery(parseSearchString(searchString));
  const result = await fetchAllForExport<EventBookingQuery, AdminEventBooking>(query, listEventBookings);
  if (!result.ok) {
    log.warn("Export event-support bookings failed", { kind: result.error.kind });
    return { ok: false, error: errorMessage(result.error) };
  }
  return {
    ok: true,
    data: {
      csv: toCsv(EVENT_BOOKING_CSV_HEADERS, result.items.map(eventBookingCsvRow)),
      filename: exportFilename("event-support"),
      rowCount: result.items.length,
    },
  };
}
