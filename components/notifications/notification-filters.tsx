"use client";

import { usePathname, useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  NOTIFICATION_FILTERS,
  NOTIFICATION_SOURCE_MODULES,
  toNotificationsSearchString,
  type NotificationsQuery,
} from "@/lib/notifications/query";
import { SOURCE_MODULE_LABEL } from "@/lib/notifications/source";

/** Radix Select reserves "" for "no value" (shows the placeholder) --
 *  same convention as components/bookings/booking-filters.tsx. */
const ALL = "all";

const FILTER_LABEL: Record<(typeof NOTIFICATION_FILTERS)[number], string> = {
  all: "Semua",
  unresolved: "Belum diproses",
};

/**
 * Filter bar for /notifications. Not built on the generic
 * components/bookings/booking-filters.tsx: that component is coupled to
 * BookingListQuery's search/date-range shape, which this list has neither
 * of (see lib/notifications/query.ts) -- hand-rolled instead, following
 * the same navigate()-resets-to-page-1 and ALL-sentinel conventions.
 */
export function NotificationFilters({ query }: { query: NotificationsQuery }) {
  const router = useRouter();
  const pathname = usePathname();

  function navigate(patch: Partial<NotificationsQuery>) {
    const merged = { page: 1, ...patch };
    router.replace(`${pathname}${toNotificationsSearchString(query, merged)}`, { scroll: false });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        value={query.sourceModule ?? ALL}
        onValueChange={(v) => navigate({ sourceModule: v === ALL ? undefined : (v as NotificationsQuery["sourceModule"]) })}
      >
        <SelectTrigger className="w-44" aria-label="Filter modul">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Semua modul</SelectItem>
          {NOTIFICATION_SOURCE_MODULES.map((m) => (
            <SelectItem key={m} value={m}>
              {SOURCE_MODULE_LABEL[m]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={query.filter} onValueChange={(v) => navigate({ filter: v as NotificationsQuery["filter"] })}>
        <SelectTrigger className="w-44" aria-label="Filter status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {NOTIFICATION_FILTERS.map((f) => (
            <SelectItem key={f} value={f}>
              {FILTER_LABEL[f]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
