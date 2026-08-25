import Link from "next/link";
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BookingStatusBadge } from "@/components/event-support/booking-status-badge";
import type { AdminEventBooking } from "@/lib/api/event-support-bookings";
import { formatIDRFull, formatDateRangeID } from "@/lib/format";

const COLUMN_COUNT = 6;

export function BookingsTable({ rows, hasActiveFilters }: { rows: AdminEventBooking[]; hasActiveFilters: boolean }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Referensi</TableHead>
          <TableHead>Pelanggan</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Tanggal acara</TableHead>
          <TableHead className="text-right">Item</TableHead>
          <TableHead className="text-right">Total</TableHead>
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
  return (
    <TableRow>
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
      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
        {formatDateRangeID(row.startDate, row.endDate)}
      </TableCell>
      <TableCell className="text-right text-sm text-muted-foreground">{row.items.length}</TableCell>
      <TableCell className="whitespace-nowrap text-right font-medium text-primary">{formatIDRFull(row.total)}</TableCell>
    </TableRow>
  );
}
