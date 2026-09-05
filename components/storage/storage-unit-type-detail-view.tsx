"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ImageOff, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DetailCard, DetailRow } from "@/components/ui/detail-card";
import { RichTextView } from "@/components/ui/rich-text-view";
import { StorageUnitTypeForm } from "@/components/storage/storage-unit-type-form";
import { deleteStorageUnitTypeAction } from "@/app/actions/storage";
import { formatIDRFull } from "@/lib/format";
import type { AdminStorageUnitType } from "@/lib/api/storage";

export function StorageUnitTypeDetailView({ unitType: initialUnitType }: { unitType: AdminStorageUnitType }) {
  const router = useRouter();
  const [unitType, setUnitType] = useState(initialUnitType);
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [deletePending, startDeleteTransition] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function handleSaved(fresh: AdminStorageUnitType) {
    setUnitType(fresh);
    setMode("view");
  }

  function handleDelete() {
    if (!window.confirm(`Hapus tipe unit "${unitType.name}"? Tindakan ini tidak dapat dibatalkan.`)) return;
    setDeleteError(null);
    startDeleteTransition(async () => {
      const result = await deleteStorageUnitTypeAction(unitType.id);
      if (!result.ok) {
        setDeleteError(result.error);
        return;
      }
      router.push("/storage/unit-types");
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-primary">{unitType.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{unitType.slug}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={unitType.isActive ? "default" : "secondary"}>{unitType.isActive ? "Aktif" : "Nonaktif"}</Badge>
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
        <StorageUnitTypeForm mode="edit" unitType={unitType} onSaved={handleSaved} onCancel={() => setMode("view")} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-6 lg:col-span-2">
            <DetailCard title="Gambar">
              {unitType.image ? (
                <div className="relative aspect-video w-full max-w-sm overflow-hidden rounded-md bg-muted">
                  <Image src={unitType.image.url} alt={unitType.image.alt ?? unitType.name} fill className="object-contain" sizes="384px" />
                </div>
              ) : (
                <div className="flex aspect-video w-full max-w-sm items-center justify-center rounded-md border border-dashed border-border text-muted-foreground">
                  <ImageOff className="size-6" />
                </div>
              )}
            </DetailCard>

            <DetailCard title="Deskripsi">
              <RichTextView html={unitType.description} />
            </DetailCard>
          </div>

          <div className="flex flex-col gap-6">
            <DetailCard title="Spesifikasi">
              <DetailRow label="Tarif / bulan" value={formatIDRFull(unitType.monthlyRate)} />
              <DetailRow label="Durasi minimum" value={`${unitType.minDurationMonths} bulan`} />
              <DetailRow
                label="Sewa mingguan"
                value={
                  unitType.supportsWeekly && unitType.weeklyRate != null
                    ? `${formatIDRFull(unitType.weeklyRate)} / minggu`
                    : "Tidak aktif"
                }
              />
              {unitType.supportsWeekly && (
                <DetailRow label="Durasi minimum (mingguan)" value={`${unitType.minDurationWeeks ?? 1} minggu`} />
              )}
              {unitType.volumeM3 != null && <DetailRow label="Volume" value={`${unitType.volumeM3} m³`} />}
              {unitType.dimensions && (
                <DetailRow
                  label="Dimensi"
                  value={`${unitType.dimensions.lengthCm} × ${unitType.dimensions.widthCm} × ${unitType.dimensions.heightCm} cm`}
                />
              )}
              <DetailRow label="Urutan" value={unitType.sortOrder} />
            </DetailCard>

            <div className="rounded-lg border border-destructive/30 p-4">
              <h2 className="text-sm font-semibold text-destructive">Hapus tipe unit</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Tipe unit yang masih dipakai pada inventaris tidak dapat dihapus — hapus inventarisnya
                terlebih dahulu.
              </p>
              <Button
                variant="outlineSecondary"
                className="mt-3 border-destructive/40 text-destructive hover:bg-destructive/10"
                onClick={handleDelete}
                disabled={deletePending}
              >
                <Trash2 className="size-4" />
                {deletePending ? "Menghapus…" : "Hapus tipe unit"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
