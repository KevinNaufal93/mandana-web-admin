import { Badge } from "@/components/ui/badge";
import type { MovingLeadStatus } from "@/lib/moving/query";

const STATUS_LABEL: Record<MovingLeadStatus, string> = {
  new: "Baru",
  contacted: "Dihubungi",
  converted: "Dikonversi",
  lost: "Hilang",
};

/** Cold → warm → terminal progression, same precedent as
 *  storage-booking-status-badge.tsx. This app has no fifth, truly neutral
 *  variant, so `outline` doing double duty for the two ends of the
 *  spectrum ("new" and "lost") is fine — they read differently anyway via
 *  label and position. */
const STATUS_VARIANT: Record<MovingLeadStatus, "outline" | "default" | "secondary" | "accent"> = {
  new: "outline",
  contacted: "default",
  converted: "accent",
  lost: "secondary",
};

export function MovingLeadStatusBadge({ status }: { status: MovingLeadStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>;
}
