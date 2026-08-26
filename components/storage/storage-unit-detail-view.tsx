"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DetailCard, DetailRow } from "@/components/ui/detail-card";
import { StorageUnitStatusBadge } from "@/components/storage/storage-unit-status-badge";
import { StorageUnitForm } from "@/components/storage/storage-unit-form";
import { deleteStorageUnitAction } from "@/app/actions/storage-units";
import type { AdminStorageUnit } from "@/lib/api/storage-units";
import type { AdminStorageFacility, AdminStorageUnitType } from "@/lib/api/storage";

export function StorageUnitDetailView({
  unit: initialUnit,
  facilities,
  unitTypes,
}: {
  unit: AdminStorageUnit;
  facilities: AdminStorageFacility[];
  unitTypes: AdminStorageUnitType[];
}) {
  const router = useRouter();
  const [unit, setUnit] = useState(initialUnit);
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [deletePending, startDeleteTransition] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const facility = facilities.find((f) => f.id === unit.facilityId);
  const unitType = unitTypes.find((t) => t.id === unit.unitTypeId);

  function handleSaved(fresh: AdminStorageUnit) {
    setUnit(fresh);
    setMode("view");
  }

  function handleDelete() {
    if (!window.confirm(`Hapus unit "${unit.code}"? Tindakan ini tidak dapat dibatalkan.`)) return;
    setDeleteError(null);
    startDeleteTransition(async () => {
      const result = await deleteStorageUnitAction(unit.id);
      if (!result.ok) {
        setDeleteError(result.error);
        return;
      }
      router.push("/storage/units");
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-primary">{unit.code}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {facility?.name ?? unit.facilitySlug} · {unitType?.name ?? unit.unitTypeSlug}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StorageUnitStatusBadge status={unit.status} />
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
        <StorageUnitForm
          mode="edit"
          unit={unit}
          facilities={facilities}
          unitTypes={unitTypes}
          onSaved={handleSaved}
          onCancel={() => setMode("view")}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-6 lg:col-span-2">
            <DetailCard title="Detail">
              <DetailRow label="Fasilitas" value={facility?.name ?? unit.facilitySlug} />
              <DetailRow label="Tipe unit" value={unitType?.name ?? unit.unitTypeSlug} />
              <DetailRow label="Aktif" value={unit.isActive ? "Ya" : "Tidak"} />
              {unit.bookingId && (
                <DetailRow
                  label="Pemesanan"
                  value={
                    <Link href={`/storage/bookings/${unit.bookingId}`} className="hover:underline">
                      Lihat pemesanan
                    </Link>
                  }
                />
              )}
            </DetailCard>
          </div>

          <div className="flex flex-col gap-6">
            <div className="rounded-lg border border-destructive/30 p-4">
              <h2 className="text-sm font-semibold text-destructive">Hapus unit</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Unit yang sedang terisi pada pemesanan aktif tidak dapat dihapus.
              </p>
              <Button
                variant="outlineSecondary"
                className="mt-3 border-destructive/40 text-destructive hover:bg-destructive/10"
                onClick={handleDelete}
                disabled={deletePending}
              >
                <Trash2 className="size-4" />
                {deletePending ? "Menghapus…" : "Hapus unit"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
