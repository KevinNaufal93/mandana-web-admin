import { Badge } from "@/components/ui/badge";
import type { StorageBookingStatus } from "@/lib/storage/query";

const STATUS_LABEL: Record<StorageBookingStatus, string> = {
  pending: "Menunggu",
  confirmed: "Terkonfirmasi",
  rejected: "Ditolak",
  cancelled: "Dibatalkan",
  completed: "Selesai",
};

const STATUS_VARIANT: Record<StorageBookingStatus, "outline" | "default" | "secondary" | "accent"> = {
  pending: "outline",
  confirmed: "default",
  rejected: "secondary",
  cancelled: "secondary",
  completed: "accent",
};

export function StorageBookingStatusBadge({ status }: { status: StorageBookingStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>;
}
