import Link from "next/link";
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { NotificationStatusChip } from "@/components/notifications/notification-status-chip";
import type { AdminNotification } from "@/lib/api/notifications";
import { sourceModuleBookingHref, SOURCE_MODULE_LABEL } from "@/lib/notifications/source";
import { formatIDRFull } from "@/lib/format";

const COLUMN_COUNT = 6;

export function NotificationsTable({
  rows,
  hasActiveFilters,
}: {
  rows: AdminNotification[];
  hasActiveFilters: boolean;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Referensi</TableHead>
          <TableHead>Modul</TableHead>
          <TableHead>Pelanggan</TableHead>
          <TableHead>Asal</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableEmpty colSpan={COLUMN_COUNT}>
            {hasActiveFilters
              ? "Tidak ada notifikasi yang cocok dengan filter ini."
              : "Belum ada notifikasi. Pemesanan baru dari ketiga modul akan muncul di sini."}
          </TableEmpty>
        ) : (
          rows.map((row) => <NotificationTableRow key={row.id} row={row} />)
        )}
      </TableBody>
    </Table>
  );
}

function NotificationTableRow({ row }: { row: AdminNotification }) {
  const isResolved = row.resolvedAt !== null;
  const isUnread = row.readAt === null;

  return (
    <TableRow className={!isResolved && isUnread ? "bg-accent/20 hover:bg-accent/30" : undefined}>
      <TableCell>
        <Link
          href={sourceModuleBookingHref(row.sourceModule, row.sourceId)}
          className="font-medium text-primary hover:underline"
        >
          {row.reference}
        </Link>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{SOURCE_MODULE_LABEL[row.sourceModule]}</TableCell>
      <TableCell className="text-sm text-primary">{row.customerName ?? "Tanpa nama"}</TableCell>
      <TableCell>
        <Badge variant={row.origin === "customer" ? "outline" : "secondary"}>
          {row.origin === "customer" ? "Pelanggan" : "Admin"}
        </Badge>
      </TableCell>
      <TableCell className="whitespace-nowrap text-right font-medium text-primary">{formatIDRFull(row.total)}</TableCell>
      <TableCell>
        <NotificationStatusChip resolvedStatus={row.resolvedStatus} />
      </TableCell>
    </TableRow>
  );
}
