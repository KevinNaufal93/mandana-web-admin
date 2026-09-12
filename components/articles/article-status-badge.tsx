import { Badge } from "@/components/ui/badge";
import type { ArticleStatus } from "@/lib/articles/query";

const STATUS_LABEL: Record<ArticleStatus, string> = {
  draft: "Draf",
  published: "Terbit",
  archived: "Arsip",
};

const STATUS_VARIANT: Record<ArticleStatus, "outline" | "default" | "secondary"> = {
  draft: "outline",
  published: "default",
  archived: "secondary",
};

export function ArticleStatusBadge({ status }: { status: ArticleStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>;
}
