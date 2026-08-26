import Link from "next/link";
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { AdminStorageInventory } from "@/lib/api/storage-inventory";
import type { AdminStorageFacility, AdminStorageUnitType } from "@/lib/api/storage";
import { formatIDRFull } from "@/lib/format";

const COLUMN_COUNT = 4;

/**
 * Facility/unit-type names aren't on StorageInventoryDto (only ids +
 * slugs) — resolved here from the two catalogs the page already fetched
 * for the filter bar, same join event-support's item table does for
 * categoryName (except that one comes for free on the DTO; here it
 * doesn't, so the lookup lives in this table instead).
 */
export function StorageInventoryTable({
  rows,
  facilities,
  unitTypes,
  hasActiveFilters,
}: {
  rows: AdminStorageInventory[];
  facilities: AdminStorageFacility[];
  unitTypes: AdminStorageUnitType[];
  hasActiveFilters: boolean;
}) {
  const facilityById = new Map(facilities.map((f) => [f.id, f]));
  const unitTypeById = new Map(unitTypes.map((t) => [t.id, t]));

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Fasilitas</TableHead>
          <TableHead>Tipe unit</TableHead>
          <TableHead className="text-right">Tarif efektif / bulan</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableEmpty colSpan={COLUMN_COUNT}>
            {hasActiveFilters
              ? "Tidak ada inventaris yang cocok dengan filter ini."
              : "Belum ada inventaris. Hubungkan fasilitas dengan tipe unit di sini."}
          </TableEmpty>
        ) : (
          rows.map((row) => (
            <InventoryRow key={row.id} row={row} facility={facilityById.get(row.facilityId)} unitType={unitTypeById.get(row.unitTypeId)} />
          ))
        )}
      </TableBody>
    </Table>
  );
}

function InventoryRow({
  row,
  facility,
  unitType,
}: {
  row: AdminStorageInventory;
  facility: AdminStorageFacility | undefined;
  unitType: AdminStorageUnitType | undefined;
}) {
  const effectiveRate = row.monthlyRateOverride ?? unitType?.monthlyRate ?? null;
  return (
    <TableRow>
      <TableCell>
        <Link href={`/storage/inventory/${row.id}`} className="font-medium text-primary hover:underline">
          {facility?.name ?? row.facilitySlug}
        </Link>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{unitType?.name ?? row.unitTypeSlug}</TableCell>
      <TableCell className="whitespace-nowrap text-right text-sm">
        {effectiveRate != null ? (
          <span className={row.monthlyRateOverride != null ? "font-medium text-primary" : "text-muted-foreground"}>
            {formatIDRFull(effectiveRate)}
            {row.monthlyRateOverride != null && <span className="ml-1 text-xs text-muted-foreground">(override)</span>}
          </span>
        ) : (
          "—"
        )}
      </TableCell>
      <TableCell>
        <Badge variant={row.isActive ? "default" : "secondary"}>{row.isActive ? "Aktif" : "Nonaktif"}</Badge>
      </TableCell>
    </TableRow>
  );
}
