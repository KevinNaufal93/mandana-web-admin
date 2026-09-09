import { Badge } from "@/components/ui/badge";
import type { PropertyStatus, ListingType } from "@/lib/properties/query";

export const STATUS_LABEL: Record<PropertyStatus, string> = {
  draft: "Draf",
  published: "Terbit",
  archived: "Arsip",
  sold: "Terjual",
  rented: "Tersewa",
};

const STATUS_VARIANT: Record<PropertyStatus, "outline" | "default" | "secondary"> = {
  draft: "outline",
  published: "default",
  archived: "secondary",
  // Same muted weight as archived — sold/rented are no longer actionable
  // listings either, even though (unlike archived) they still show
  // publicly. See PUBLIC_PROPERTY_STATUSES in the API.
  sold: "secondary",
  rented: "secondary",
};

export function PropertyStatusBadge({ status }: { status: PropertyStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>;
}

export const LISTING_LABEL: Record<ListingType, string> = {
  sale: "Dijual",
  rent: "Disewa",
  new: "Baru",
};

const LISTING_VARIANT: Record<ListingType, "dijual" | "disewa" | "baru"> = {
  sale: "dijual",
  rent: "disewa",
  new: "baru",
};

export function ListingTypeBadge({ listingType }: { listingType: ListingType }) {
  return <Badge variant={LISTING_VARIANT[listingType]}>{LISTING_LABEL[listingType]}</Badge>;
}
