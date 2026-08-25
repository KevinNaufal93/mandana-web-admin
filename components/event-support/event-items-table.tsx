import Image from "next/image";
import Link from "next/link";
import { ImageOff } from "lucide-react";
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EventItemStatusBadge, EventItemKindBadge } from "@/components/event-support/event-item-status-badge";
import type { AdminEventItem } from "@/lib/api/event-support";
import { formatIDRShort } from "@/lib/format";

const COLUMN_COUNT = 6;

export function EventItemsTable({ rows, hasActiveFilters }: { rows: AdminEventItem[]; hasActiveFilters: boolean }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Item</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Kategori</TableHead>
          <TableHead>Jenis</TableHead>
          <TableHead className="text-right">Stok</TableHead>
          <TableHead className="text-right">Harga / hari</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableEmpty colSpan={COLUMN_COUNT}>
            {hasActiveFilters
              ? "Tidak ada item yang cocok dengan filter ini."
              : "Belum ada item. Item yang ditambahkan akan muncul di sini."}
          </TableEmpty>
        ) : (
          rows.map((row) => <ItemRow key={row.id} row={row} />)
        )}
      </TableBody>
    </Table>
  );
}

function ItemRow({ row }: { row: AdminEventItem }) {
  return (
    <TableRow>
      <TableCell>
        <Link href={`/event-support/items/${row.id}`} className="flex items-center gap-3">
          <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
            {row.image ? (
              <Image src={row.image.url} alt={row.image.alt ?? row.name} fill className="object-cover" sizes="64px" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                <ImageOff className="size-4" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium text-primary hover:underline">{row.name}</p>
            <p className="truncate text-xs text-muted-foreground">{row.slug}</p>
          </div>
        </Link>
      </TableCell>
      <TableCell>
        <EventItemStatusBadge status={row.status} />
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{row.categoryName}</TableCell>
      <TableCell>
        <EventItemKindBadge kind={row.kind} />
      </TableCell>
      {/* stockQuantity is total inventory, never "available on this date" —
          see the event-support availability model. Labelled "Stok", not
          "Tersedia", on purpose. */}
      <TableCell className="text-right text-sm text-muted-foreground">{row.stockQuantity}</TableCell>
      <TableCell className="whitespace-nowrap text-right font-medium text-primary">
        {formatIDRShort(row.pricePerDay)}
      </TableCell>
    </TableRow>
  );
}
