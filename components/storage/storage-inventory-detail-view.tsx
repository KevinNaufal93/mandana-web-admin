"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DetailCard, DetailRow } from "@/components/ui/detail-card";
import { StorageInventoryForm } from "@/components/storage/storage-inventory-form";
import { deleteStorageInventoryAction } from "@/app/actions/storage-inventory";
import { formatIDRFull } from "@/lib/format";
import type { AdminStorageInventory } from "@/lib/api/storage-inventory";
import type { AdminStorageFacility, AdminStorageUnitType } from "@/lib/api/storage";

/** Few enough fields that a separate detail-view could arguably be an
 *  inline edit instead — kept as its own component for consistency with
 *  every other resource in this module (facility/unit-type/unit all
 *  follow the same view/edit split). */
export function StorageInventoryDetailView({
  inventory: initialInventory,
  facilities,
  unitTypes,
}: {
  inventory: AdminStorageInventory;
  facilities: AdminStorageFacility[];
  unitTypes: AdminStorageUnitType[];
}) {
  const router = useRouter();
  const [inventory, setInventory] = useState(initialInventory);
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [deletePending, startDeleteTransition] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const facility = facilities.find((f) => f.id === inventory.facilityId);
  const unitType = unitTypes.find((t) => t.id === inventory.unitTypeId);
  const effectiveRate = inventory.monthlyRateOverride ?? unitType?.monthlyRate ?? null;
  const effectiveWeeklyRate = inventory.weeklyRateOverride ?? unitType?.weeklyRate ?? null;

  function handleSaved(fresh: AdminStorageInventory) {
    setInventory(fresh);
    setMode("view");
  }

  function handleDelete() {
    if (!window.confirm("Hapus baris inventaris ini? Tindakan ini tidak dapat dibatalkan.")) return;
    setDeleteError(null);
    startDeleteTransition(async () => {
      const result = await deleteStorageInventoryAction(inventory.id);
      if (!result.ok) {
        setDeleteError(result.error);
        return;
      }
      router.push("/storage/inventory");
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-primary">
            {facility?.name ?? inventory.facilitySlug} · {unitType?.name ?? inventory.unitTypeSlug}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Inventaris</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={inventory.isActive ? "default" : "secondary"}>{inventory.isActive ? "Aktif" : "Nonaktif"}</Badge>
          {mode === "view" && (
            <Button variant="secondary" onClick={() => setMode("edit")}>
              <Pencil className="size-4" />
              Edit
            </Button>
          )}
        </div>
      </div>

      {deleteError && (
        <p role="alert" className="text-sm text-destructive">
          {deleteError}
        </p>
      )}

      {mode === "edit" ? (
        <StorageInventoryForm
          mode="edit"
          inventory={inventory}
          facilities={facilities}
          unitTypes={unitTypes}
          onSaved={handleSaved}
          onCancel={() => setMode("view")}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-6 lg:col-span-2">
            <DetailCard title="Detail">
              <DetailRow label="Fasilitas" value={facility?.name ?? inventory.facilitySlug} />
              <DetailRow label="Tipe unit" value={unitType?.name ?? inventory.unitTypeSlug} />
              <DetailRow
                label="Tarif efektif / bulan"
                value={effectiveRate != null ? formatIDRFull(effectiveRate) : "—"}
              />
              {inventory.monthlyRateOverride != null && (
                <DetailRow label="Tarif dasar tipe unit" value={unitType ? formatIDRFull(unitType.monthlyRate) : "—"} />
              )}
              {unitType?.supportsWeekly && (
                <>
                  <DetailRow
                    label="Tarif efektif / minggu"
                    value={effectiveWeeklyRate != null ? formatIDRFull(effectiveWeeklyRate) : "—"}
                  />
                  {inventory.weeklyRateOverride != null && (
                    <DetailRow
                      label="Tarif mingguan dasar tipe unit"
                      value={unitType.weeklyRate != null ? formatIDRFull(unitType.weeklyRate) : "—"}
                    />
                  )}
                </>
              )}
            </DetailCard>
          </div>

          <div className="flex flex-col gap-6">
            <div className="rounded-lg border border-destructive/30 p-4">
              <h2 className="text-sm font-semibold text-destructive">Hapus inventaris</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Menghapus baris ini menghentikan penawaran kombinasi fasilitas dan tipe unit ini — unit yang
                sudah ada tidak ikut terhapus.
              </p>
              <Button
                variant="outlineSecondary"
                className="mt-3 border-destructive/40 text-destructive hover:bg-destructive/10"
                onClick={handleDelete}
                disabled={deletePending}
              >
                <Trash2 className="size-4" />
                {deletePending ? "Menghapus…" : "Hapus inventaris"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
