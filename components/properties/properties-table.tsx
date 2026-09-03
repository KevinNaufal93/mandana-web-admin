import Image from "next/image";
import Link from "next/link";
import { ImageOff } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PropertyStatusBadge,
  ListingTypeBadge,
} from "@/components/properties/property-status-badge";
import { coverOf, type AdminPropertyRow } from "@/lib/api/properties";
import { composeLocation, formatIDRShort, toNum } from "@/lib/format";

const COLUMN_COUNT = 6;

export function PropertiesTable({
  rows,
  hasActiveFilters,
}: {
  rows: AdminPropertyRow[];
  hasActiveFilters: boolean;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Properti</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Tipe</TableHead>
          <TableHead>Lokasi</TableHead>
          <TableHead>Spesifikasi</TableHead>
          <TableHead className="text-right">Harga</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableEmpty colSpan={COLUMN_COUNT}>
            {hasActiveFilters
              ? "Tidak ada properti yang cocok dengan filter ini."
              : "Belum ada properti. Klik \"Properti baru\" di atas untuk menambahkan yang pertama."}
          </TableEmpty>
        ) : (
          rows.map((row) => <PropertyRow key={row.id} row={row} />)
        )}
      </TableBody>
    </Table>
  );
}

function PropertyRow({ row }: { row: AdminPropertyRow }) {
  const cover = coverOf(row);
  const price = toNum(row.price);
  const areaSqm = toNum(row.areaSqm);

  return (
    <TableRow>
      <TableCell>
        <Link href={`/properties/${row.id}`} className="flex items-center gap-3">
          <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
            {cover ? (
              <Image
                src={cover.url}
                alt={cover.alt ?? row.title}
                fill
                className="object-cover"
                sizes="64px"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                <ImageOff className="size-4" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium text-primary hover:underline">{row.title}</p>
            <p className="truncate text-xs text-muted-foreground">{row.slug}</p>
          </div>
        </Link>
      </TableCell>
      <TableCell>
        <PropertyStatusBadge status={row.status} />
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-1 items-start">
          <ListingTypeBadge listingType={row.listingType} />
          {row.propertyType && (
            <span className="text-xs text-muted-foreground">
              {row.propertyType.name}
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className="max-w-48 truncate text-sm text-muted-foreground">
        {composeLocation(row) || "—"}
      </TableCell>
      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
        {[
          row.bedrooms !== null ? `${row.bedrooms} KT` : null,
          row.bathrooms !== null ? `${row.bathrooms} KM` : null,
          areaSqm !== null ? `${areaSqm} m²` : null,
        ]
          .filter(Boolean)
          .join(" · ") || "—"}
      </TableCell>
      <TableCell className="whitespace-nowrap text-right font-medium text-primary">
        {price !== null ? formatIDRShort(price) : "—"}
      </TableCell>
    </TableRow>
  );
}
