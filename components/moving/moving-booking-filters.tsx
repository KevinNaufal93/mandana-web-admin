"use client";

import { BookingFilters } from "@/components/bookings/booking-filters";
import { STATUS_LABEL } from "@/components/moving/moving-booking-status-badge";
import { MOVING_BOOKING_STATUSES, toMovingBookingSearchString, type MovingBookingQuery } from "@/lib/moving/query";

/** Thin per-module wrapper around the shared BookingFilters — see that
 *  file for the search/status/date-range mechanics this reuses. No extra
 *  module-only filters here, unlike Storage's facility/unit-type. */
export function MovingBookingFilters({ query }: { query: MovingBookingQuery }) {
  return (
    <BookingFilters<MovingBookingQuery>
      query={query}
      statuses={MOVING_BOOKING_STATUSES}
      statusLabels={STATUS_LABEL}
      toSearchString={toMovingBookingSearchString}
    />
  );
}
