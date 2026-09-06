import Link from "next/link";
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SortableHead } from "@/components/bookings/sortable-head";
import { BookingStatusBadge } from "@/components/event-support/booking-status-badge";
import type { AdminEventBooking } from "@/lib/api/event-support-bookings";
import { toBookingSearchString, type EventBookingQuery } from "@/lib/event-support/query";
import { formatIDRFull, formatDateID, formatDateRangeID } from "@/lib/format";

const COLUMN_COUNT = 7;

export function BookingsTable({
  rows,
  hasActiveFilters,
  query,
  basePath,
}: {
  rows: AdminEventBooking[];
  hasActiveFilters: boolean;
  query: EventBookingQuery;
  basePath: string;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <SortableHead query={query} basePath={basePath} toSearchString={toBookingSearchString} sortKey="reference" defaultOrder="asc">
            Referensi
          </SortableHead>
          <TableHead>Pelanggan</TableHead>
          <TableHead>Status</TableHead>
          <SortableHead query={query} basePath={basePath} toSearchString={toBookingSearchString} sortKey="createdAt">
            Tanggal pemesanan
          </SortableHead>
          <SortableHead query={query} basePath={basePath} toSearchString={toBookingSearchString} sortKey="startDate">
            Tanggal acara
          </SortableHead>
          <TableHead className="text-right">Item</TableHead>
          <SortableHead query={query} basePath={basePath} toSearchString={toBookingSearchString} sortKey="total" className="text-right">
            Total
          </SortableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableEmpty colSpan={COLUMN_COUNT}>
            {hasActiveFilters
              ? "Tidak ada pemesanan yang cocok dengan filter ini."
              : "Belum ada pemesanan. Catat pemesanan yang disepakati lewat WhatsApp di sini."}
          </TableEmpty>
        ) : (
          rows.map((row) => <BookingRow key={row.id} row={row} />)
        )}
      </TableBody>
    </Table>
  );
}

function BookingRow({ row }: { row: AdminEventBooking }) {
  // See storage-bookings-table.tsx — same warm-accent tint (not a literal
  // yellow) to flag rows still awaiting review.
  const isPending = row.status === "pending";
  return (
    <TableRow className={isPending ? "bg-accent/20 hover:bg-accent/30" : undefined}>
      <TableCell>
        <Link href={`/event-support/bookings/${row.id}`} className="font-medium text-primary hover:underline">
          {row.reference}
        </Link>
      </TableCell>
      <TableCell>
        <p className="text-sm text-primary">{row.customerName}</p>
        {row.phone && <p className="text-xs text-muted-foreground">{row.phone}</p>}
      </TableCell>
      <TableCell>
        <BookingStatusBadge status={row.status} />
      </TableCell>
      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatDateID(row.createdAt)}</TableCell>
      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
        {formatDateRangeID(row.startDate, row.endDate)}
      </TableCell>
      <TableCell className="text-right text-sm text-muted-foreground">{row.items.length}</TableCell>
      <TableCell className="whitespace-nowrap text-right font-medium text-primary">{formatIDRFull(row.total)}</TableCell>
    </TableRow>
  );
}
