import Image from "next/image";
import Link from "next/link";
import { ImageOff } from "lucide-react";
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { AdminStorageUnitType } from "@/lib/api/storage";
import { formatIDRShort } from "@/lib/format";

const COLUMN_COUNT = 5;

export function StorageUnitTypesTable({ rows, hasActiveFilters }: { rows: AdminStorageUnitType[]; hasActiveFilters: boolean }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tipe unit</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Tarif / bulan</TableHead>
          <TableHead className="text-right">Tarif / minggu</TableHead>
          <TableHead className="text-right">Durasi min.</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableEmpty colSpan={COLUMN_COUNT}>
            {hasActiveFilters
              ? "Tidak ada tipe unit yang cocok dengan filter ini."
              : "Belum ada tipe unit. Tipe unit yang ditambahkan akan muncul di sini."}
          </TableEmpty>
        ) : (
          rows.map((row) => <UnitTypeRow key={row.id} row={row} />)
        )}
      </TableBody>
    </Table>
  );
}

function UnitTypeRow({ row }: { row: AdminStorageUnitType }) {
  return (
    <TableRow>
      <TableCell>
        <Link href={`/storage/unit-types/${row.id}`} className="flex items-center gap-3">
          <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
            {row.image ? (
              <Image src={row.image.url} alt={row.image.alt ?? row.name} fill className="object-contain" sizes="64px" />
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
        <Badge variant={row.isActive ? "default" : "secondary"}>{row.isActive ? "Aktif" : "Nonaktif"}</Badge>
      </TableCell>
      <TableCell className="whitespace-nowrap text-right font-medium text-primary">
        {formatIDRShort(row.monthlyRate)}
      </TableCell>
      <TableCell className="whitespace-nowrap text-right text-sm">
        {row.supportsWeekly && row.weeklyRate != null ? (
          <span className="font-medium text-primary">{formatIDRShort(row.weeklyRate)}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="text-right text-sm text-muted-foreground">{row.minDurationMonths} bln</TableCell>
    </TableRow>
  );
}
