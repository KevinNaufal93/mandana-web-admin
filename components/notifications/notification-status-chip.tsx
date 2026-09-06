import { Badge, type BadgeProps } from "@/components/ui/badge";

/**
 * A notification's `resolvedStatus` is a free-text field spanning three
 * different Postgres enums (see AdminNotification on the API side) --
 * Storage and Moving both have "rejected", Event Support does not, and the
 * three modules' own per-module badges (StorageBookingStatusBadge,
 * MovingBookingStatusBadge, BookingStatusBadge in event-support) don't even
 * agree on a variant for the same status. Rendered here, in one unified
 * feed spanning all three modules, that disagreement would read as
 * arbitrary rather than meaningful -- so this is its own small, internally
 * consistent map, not a reuse of any one module's.
 */
const RESOLVED_STATUS_LABEL: Record<string, string> = {
  confirmed: "Terkonfirmasi",
  rejected: "Ditolak",
  cancelled: "Dibatalkan",
  completed: "Selesai",
};

const RESOLVED_STATUS_VARIANT: Record<string, BadgeProps["variant"]> = {
  confirmed: "default",
  rejected: "accent",
  cancelled: "secondary",
  completed: "accent",
};

export function NotificationStatusChip({ resolvedStatus }: { resolvedStatus: string | null }) {
  if (!resolvedStatus) {
    return <Badge variant="outline">Menunggu</Badge>;
  }
  const label = RESOLVED_STATUS_LABEL[resolvedStatus] ?? resolvedStatus;
  const variant = RESOLVED_STATUS_VARIANT[resolvedStatus] ?? "secondary";
  return <Badge variant={variant}>{label}</Badge>;
}
