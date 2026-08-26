import Image from "next/image";
import Link from "next/link";
import { ImageOff } from "lucide-react";
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { AdminStorageFacility } from "@/lib/api/storage";
import { composeLocation } from "@/lib/format";

const COLUMN_COUNT = 4;

export function StorageFacilitiesTable({ rows, hasActiveFilters }: { rows: AdminStorageFacility[]; hasActiveFilters: boolean }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Fasilitas</TableHead>
          <TableHead>Lokasi</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Urutan</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableEmpty colSpan={COLUMN_COUNT}>
            {hasActiveFilters
              ? "Tidak ada fasilitas yang cocok dengan filter ini."
              : "Belum ada fasilitas. Fasilitas yang ditambahkan akan muncul di sini."}
          </TableEmpty>
        ) : (
          rows.map((row) => <FacilityRow key={row.id} row={row} />)
        )}
      </TableBody>
    </Table>
  );
}

function FacilityRow({ row }: { row: AdminStorageFacility }) {
  const location = composeLocation(row);
  return (
    <TableRow>
      <TableCell>
        <Link href={`/storage/facilities/${row.id}`} className="flex items-center gap-3">
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
      <TableCell className="text-sm text-muted-foreground">{location || "—"}</TableCell>
      <TableCell>
        <Badge variant={row.isActive ? "default" : "secondary"}>{row.isActive ? "Aktif" : "Nonaktif"}</Badge>
      </TableCell>
      <TableCell className="text-right text-sm text-muted-foreground">{row.sortOrder}</TableCell>
    </TableRow>
  );
}
