"use client";

import { BookingFilters as GenericBookingFilters } from "@/components/bookings/booking-filters";
import { STATUS_LABEL } from "@/components/event-support/booking-status-badge";
import { EVENT_BOOKING_STATUSES, toBookingSearchString, type EventBookingQuery } from "@/lib/event-support/query";

/**
 * Thin per-module wrapper around the shared BookingFilters — see that
 * file for the search/status/date-range mechanics this reuses.
 *
 * `from`/`to` now bound createdAt (capture time), not the event window —
 * see lib/event-support/query.ts's header comment for the breaking
 * change carried over from the API. Labelled "tanggal masuk" (not
 * "tanggal acara") so the control doesn't keep implying the old meaning.
 */
export function BookingFilters({ query }: { query: EventBookingQuery }) {
  return (
    <GenericBookingFilters<EventBookingQuery>
      query={query}
      statuses={EVENT_BOOKING_STATUSES}
      statusLabels={STATUS_LABEL}
      toSearchString={toBookingSearchString}
      dateFromLabel="Dari tanggal masuk"
      dateToLabel="Sampai tanggal masuk"
    />
  );
}
