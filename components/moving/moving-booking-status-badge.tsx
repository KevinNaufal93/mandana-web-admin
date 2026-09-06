import { Badge } from "@/components/ui/badge";
import type { MovingBookingStatus } from "@/lib/moving/query";

export const STATUS_LABEL: Record<MovingBookingStatus, string> = {
  pending: "Menunggu",
  confirmed: "Terkonfirmasi",
  rejected: "Ditolak",
  cancelled: "Dibatalkan",
  completed: "Selesai",
};

const STATUS_VARIANT: Record<MovingBookingStatus, "outline" | "default" | "secondary" | "accent"> = {
  pending: "outline",
  confirmed: "default",
  rejected: "secondary",
  cancelled: "secondary",
  completed: "accent",
};

export function MovingBookingStatusBadge({ status }: { status: MovingBookingStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>;
}
