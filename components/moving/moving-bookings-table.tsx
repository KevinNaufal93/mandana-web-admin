import Link from "next/link";
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SortableHead } from "@/components/bookings/sortable-head";
import { MovingBookingStatusBadge } from "@/components/moving/moving-booking-status-badge";
import type { AdminMovingBooking } from "@/lib/api/moving-bookings";
import { toMovingBookingSearchString, type MovingBookingQuery } from "@/lib/moving/query";
import { formatIDRFull, formatDateID } from "@/lib/format";

const COLUMN_COUNT = 7;

export function MovingBookingsTable({
  rows,
  hasActiveFilters,
  query,
  basePath,
}: {
  rows: AdminMovingBooking[];
  hasActiveFilters: boolean;
  query: MovingBookingQuery;
  basePath: string;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <SortableHead query={query} basePath={basePath} toSearchString={toMovingBookingSearchString} sortKey="reference" defaultOrder="asc">
            Referensi
          </SortableHead>
          <TableHead>Pelanggan</TableHead>
          <TableHead>Status</TableHead>
          <SortableHead query={query} basePath={basePath} toSearchString={toMovingBookingSearchString} sortKey="createdAt">
            Tanggal pemesanan
          </SortableHead>
          <TableHead>Truk</TableHead>
          <TableHead>Tujuan</TableHead>
          <SortableHead query={query} basePath={basePath} toSearchString={toMovingBookingSearchString} sortKey="total" className="text-right">
            Total
          </SortableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableEmpty colSpan={COLUMN_COUNT}>
            {hasActiveFilters
              ? "Tidak ada pemesanan yang cocok dengan filter ini."
              : "Belum ada pemesanan. Pemesanan dari form kalkulasi akan muncul di sini."}
          </TableEmpty>
        ) : (
          rows.map((row) => <BookingRow key={row.id} row={row} />)
        )}
      </TableBody>
    </Table>
  );
}

function BookingRow({ row }: { row: AdminMovingBooking }) {
  // See storage-bookings-table.tsx — same warm-accent tint (not a literal
  // yellow) to flag rows still awaiting review.
  const isPending = row.status === "pending";
  return (
    <TableRow className={isPending ? "bg-accent/20 hover:bg-accent/30" : undefined}>
      <TableCell>
        <Link href={`/moving/bookings/${row.id}`} className="font-medium text-primary hover:underline">
          {row.reference}
        </Link>
      </TableCell>
      <TableCell>
        <p className="text-sm text-primary">{row.customerName ?? "—"}</p>
        {row.phone && <p className="text-xs text-muted-foreground">{row.phone}</p>}
      </TableCell>
      <TableCell>
        <MovingBookingStatusBadge status={row.status} />
      </TableCell>
      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatDateID(row.createdAt)}</TableCell>
      <TableCell className="text-sm text-primary">{row.truckName}</TableCell>
      {/* Indonesian nouns don't inflect for plural, so no ternary needed here. */}
      <TableCell className="text-sm text-muted-foreground">{row.destinations.length} tujuan</TableCell>
      <TableCell className="whitespace-nowrap text-right font-medium text-primary">{formatIDRFull(row.total)}</TableCell>
    </TableRow>
  );
}
