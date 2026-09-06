import Link from "next/link";
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SortableHead } from "@/components/bookings/sortable-head";
import { StorageBookingStatusBadge } from "@/components/storage/storage-booking-status-badge";
import type { AdminStorageBooking } from "@/lib/api/storage-bookings";
import { toStorageBookingSearchString, type StorageBookingQuery } from "@/lib/storage/query";
import { formatIDRFull, formatDateID } from "@/lib/format";

const COLUMN_COUNT = 8;

export function StorageBookingsTable({
  rows,
  hasActiveFilters,
  query,
  basePath,
}: {
  rows: AdminStorageBooking[];
  hasActiveFilters: boolean;
  query: StorageBookingQuery;
  basePath: string;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <SortableHead query={query} basePath={basePath} toSearchString={toStorageBookingSearchString} sortKey="reference" defaultOrder="asc">
            Referensi
          </SortableHead>
          <TableHead>Pelanggan</TableHead>
          <TableHead>Status</TableHead>
          <SortableHead query={query} basePath={basePath} toSearchString={toStorageBookingSearchString} sortKey="createdAt">
            Tanggal pemesanan
          </SortableHead>
          <TableHead>Fasilitas / tipe unit</TableHead>
          <SortableHead query={query} basePath={basePath} toSearchString={toStorageBookingSearchString} sortKey="startDate">
            Mulai
          </SortableHead>
          <TableHead>Durasi</TableHead>
          <SortableHead query={query} basePath={basePath} toSearchString={toStorageBookingSearchString} sortKey="total" className="text-right">
            Total
          </SortableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableEmpty colSpan={COLUMN_COUNT}>
            {hasActiveFilters
              ? "Tidak ada pemesanan yang cocok dengan filter ini."
              : "Belum ada pemesanan. Pemesanan dari pelanggan akan muncul di sini."}
          </TableEmpty>
        ) : (
          rows.map((row) => <BookingRow key={row.id} row={row} />)
        )}
      </TableBody>
    </Table>
  );
}

function BookingRow({ row }: { row: AdminStorageBooking }) {
  return (
    <TableRow>
      <TableCell>
        <Link href={`/storage/bookings/${row.id}`} className="font-medium text-primary hover:underline">
          {row.reference}
        </Link>
      </TableCell>
      <TableCell>
        <p className="text-sm text-primary">{row.customerName}</p>
        {row.phone && <p className="text-xs text-muted-foreground">{row.phone}</p>}
      </TableCell>
      <TableCell>
        <StorageBookingStatusBadge status={row.status} />
      </TableCell>
      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatDateID(row.createdAt)}</TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {row.facilityName} · {row.unitTypeName} × {row.quantity}
      </TableCell>
      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatDateID(row.startDate)}</TableCell>
      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
        {row.duration} {row.unitLabel}
      </TableCell>
      <TableCell className="whitespace-nowrap text-right font-medium text-primary">{formatIDRFull(row.total)}</TableCell>
    </TableRow>
  );
}
