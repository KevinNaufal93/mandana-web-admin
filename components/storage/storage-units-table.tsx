"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StorageUnitStatusBadge } from "@/components/storage/storage-unit-status-badge";
import { bulkDeleteStorageUnitsAction } from "@/app/actions/storage-units";
import type { AdminStorageUnit } from "@/lib/api/storage-units";
import type { AdminStorageFacility, AdminStorageUnitType } from "@/lib/api/storage";

const COLUMN_COUNT = 6;

/**
 * "use client" (unlike every other resource table in this module) so
 * this can own row-selection state for bulk delete. There is no
 * bulk-delete endpoint on the backend — see bulkDeleteStorageUnitsAction's
 * header comment — so this loops the single DELETE call and surfaces
 * per-unit failures rather than an all-or-nothing result.
 */
export function StorageUnitsTable({
  rows,
  facilities,
  unitTypes,
  hasActiveFilters,
}: {
  rows: AdminStorageUnit[];
  facilities: AdminStorageFacility[];
  unitTypes: AdminStorageUnitType[];
  hasActiveFilters: boolean;
}) {
  const router = useRouter();
  const facilityById = new Map(facilities.map((f) => [f.id, f]));
  const unitTypeById = new Map(unitTypes.map((t) => [t.id, t]));

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [failures, setFailures] = useState<Map<string, string>>(new Map());
  const [pending, startTransition] = useTransition();

  const rowIds = useMemo(() => rows.map((r) => r.id), [rows]);
  const allSelected = rowIds.length > 0 && rowIds.every((id) => selected.has(id));
  const someSelected = selected.size > 0;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rowIds));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleBulkDelete() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    if (!window.confirm(`Hapus ${ids.length} unit terpilih? Tindakan ini tidak dapat dibatalkan.`)) return;

    setFailures(new Map());
    startTransition(async () => {
      const result = await bulkDeleteStorageUnitsAction(ids);
      if (result.failed.length === 0) {
        setSelected(new Set());
        router.refresh();
        return;
      }
      // Partial (or total) failure — not atomic, see the action's header
      // comment. Keep only the failed rows selected so the operator can
      // see exactly which ones need attention, and refresh to drop the
      // ones that DID succeed from the list.
      setFailures(new Map(result.failed.map((f) => [f.id, f.error])));
      setSelected(new Set(result.failed.map((f) => f.id)));
      if (result.deletedCount > 0) router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {someSelected && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/40 px-4 py-2.5">
          <span className="text-sm font-medium text-primary">{selected.size} unit dipilih</span>
          <Button
            variant="outlineSecondary"
            size="sm"
            className="border-destructive/40 text-destructive hover:bg-destructive/10"
            onClick={handleBulkDelete}
            disabled={pending}
          >
            <Trash2 className="size-3.5" />
            {pending ? "Menghapus…" : "Hapus terpilih"}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())} disabled={pending}>
            Batal
          </Button>
        </div>
      )}

      {failures.size > 0 && (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <p className="font-medium">{failures.size} unit gagal dihapus:</p>
          <ul className="mt-1 list-disc pl-5">
            {rows
              .filter((r) => failures.has(r.id))
              .map((r) => (
                <li key={r.id}>
                  {r.code}: {failures.get(r.id)}
                </li>
              ))}
          </ul>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <input
                type="checkbox"
                className="accent-primary"
                checked={allSelected}
                onChange={toggleAll}
                disabled={rows.length === 0}
                aria-label="Pilih semua unit di halaman ini"
              />
            </TableHead>
            <TableHead>Kode</TableHead>
            <TableHead>Fasilitas</TableHead>
            <TableHead>Tipe unit</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Aktif</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableEmpty colSpan={COLUMN_COUNT}>
              {hasActiveFilters
                ? "Tidak ada unit yang cocok dengan filter ini."
                : "Belum ada unit. Unit yang ditambahkan akan muncul di sini."}
            </TableEmpty>
          ) : (
            rows.map((row) => (
              <UnitRow
                key={row.id}
                row={row}
                facility={facilityById.get(row.facilityId)}
                unitType={unitTypeById.get(row.unitTypeId)}
                selected={selected.has(row.id)}
                onToggle={() => toggleOne(row.id)}
              />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function UnitRow({
  row,
  facility,
  unitType,
  selected,
  onToggle,
}: {
  row: AdminStorageUnit;
  facility: AdminStorageFacility | undefined;
  unitType: AdminStorageUnitType | undefined;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <TableRow>
      <TableCell>
        <input
          type="checkbox"
          className="accent-primary"
          checked={selected}
          onChange={onToggle}
          aria-label={`Pilih unit ${row.code}`}
        />
      </TableCell>
      <TableCell>
        <Link href={`/storage/units/${row.id}`} className="font-medium text-primary hover:underline">
          {row.code}
        </Link>
        {/* Links to the occupying booking when this unit is occupied — the
            only cross-reference this DTO gives us between a unit and the
            booking holding it. */}
        {row.status === "occupied" && row.bookingId && (
          <Link href={`/storage/bookings/${row.bookingId}`} className="ml-2 text-xs text-muted-foreground hover:underline">
            lihat pemesanan
          </Link>
        )}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{facility?.name ?? row.facilitySlug}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{unitType?.name ?? row.unitTypeSlug}</TableCell>
      <TableCell>
        <StorageUnitStatusBadge status={row.status} />
      </TableCell>
      <TableCell>
        <Badge variant={row.isActive ? "default" : "secondary"}>{row.isActive ? "Aktif" : "Nonaktif"}</Badge>
      </TableCell>
    </TableRow>
  );
}
