import Link from "next/link";
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MovingLeadStatusBadge } from "@/components/moving/moving-lead-status-badge";
import type { AdminMovingLead } from "@/lib/api/moving-leads";
import { formatIDRFull, formatDateID } from "@/lib/format";

const COLUMN_COUNT = 5;

export function MovingLeadsTable({ rows, hasActiveFilters }: { rows: AdminMovingLead[]; hasActiveFilters: boolean }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Referensi</TableHead>
          <TableHead>Tanggal</TableHead>
          <TableHead>Truk</TableHead>
          <TableHead>Tujuan</TableHead>
          <TableHead className="text-right">Total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableEmpty colSpan={COLUMN_COUNT}>
            {hasActiveFilters
              ? "Tidak ada lead yang cocok dengan filter ini."
              : "Belum ada lead. Lead dari form kalkulasi akan muncul di sini."}
          </TableEmpty>
        ) : (
          rows.map((row) => <LeadRow key={row.id} row={row} />)
        )}
      </TableBody>
    </Table>
  );
}

function LeadRow({ row }: { row: AdminMovingLead }) {
  return (
    <TableRow>
      <TableCell>
        <Link href={`/moving/leads/${row.id}`} className="flex items-center gap-2">
          <span className="font-medium text-primary hover:underline">{row.reference}</span>
          <MovingLeadStatusBadge status={row.status} />
        </Link>
      </TableCell>
      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatDateID(row.createdAt)}</TableCell>
      <TableCell className="text-sm text-primary">{row.truckName}</TableCell>
      {/* Indonesian nouns don't inflect for plural, so no ternary needed here. */}
      <TableCell className="text-sm text-muted-foreground">{row.destinations.length} tujuan</TableCell>
      <TableCell className="whitespace-nowrap text-right font-medium text-primary">{formatIDRFull(row.total)}</TableCell>
    </TableRow>
  );
}
