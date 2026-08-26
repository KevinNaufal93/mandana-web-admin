import { Badge } from "@/components/ui/badge";
import type { StorageUnitStatus } from "@/lib/storage/query";

const STATUS_LABEL: Record<StorageUnitStatus, string> = {
  available: "Tersedia",
  occupied: "Terisi",
  maintenance: "Perawatan",
};

const STATUS_VARIANT: Record<
  StorageUnitStatus,
  "default" | "accent" | "outline"
> = {
  available: "default",
  occupied: "accent",
  maintenance: "outline",
};

export function StorageUnitStatusBadge({
  status,
}: {
  status: StorageUnitStatus;
}) {
  return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>;
}
