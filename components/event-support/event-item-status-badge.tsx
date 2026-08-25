import { Badge } from "@/components/ui/badge";
import type { EventItemStatus, EventItemKind } from "@/lib/event-support/query";

const STATUS_LABEL: Record<EventItemStatus, string> = {
  draft: "Draf",
  published: "Terbit",
  archived: "Arsip",
};

const STATUS_VARIANT: Record<EventItemStatus, "outline" | "default" | "secondary"> = {
  draft: "outline",
  published: "default",
  archived: "secondary",
};

export function EventItemStatusBadge({ status }: { status: EventItemStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>;
}

const KIND_LABEL: Record<EventItemKind, string> = {
  package: "Paket",
  addon: "Add on",
};

export function EventItemKindBadge({ kind }: { kind: EventItemKind }) {
  return <Badge variant="accent">{KIND_LABEL[kind]}</Badge>;
}
