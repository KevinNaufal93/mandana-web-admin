import type { NotificationSourceModule } from "@/lib/notifications/query";

/** Matches the module names in lib/ui/nav-items.ts's NAV_ITEMS, so a
 *  notification's module chip reads the same as the sidebar entry it
 *  ultimately links into. */
export const SOURCE_MODULE_LABEL: Record<NotificationSourceModule, string> = {
  moving: "Mandana Move",
  storage: "Mandana Space",
  event_support: "Mandana Living",
};

const SOURCE_MODULE_BOOKING_BASE: Record<NotificationSourceModule, string> = {
  moving: "/moving/bookings",
  storage: "/storage/bookings",
  event_support: "/event-support/bookings",
};

/** Every notification's sourceId is the booking's own id in its module's
 *  table, which is exactly what each module's booking detail route is
 *  keyed by -- see docs/booking-list-contract.md and each `bookings/[id]`
 *  page. */
export function sourceModuleBookingHref(sourceModule: NotificationSourceModule, sourceId: string): string {
  return `${SOURCE_MODULE_BOOKING_BASE[sourceModule]}/${sourceId}`;
}
