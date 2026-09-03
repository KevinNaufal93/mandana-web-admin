"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ImageOff, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DetailCard, DetailRow } from "@/components/ui/detail-card";
import { RichTextView } from "@/components/ui/rich-text-view";
import { MovingTruckClassForm } from "@/components/moving/moving-truck-class-form";
import { deleteMovingTruckClassAction } from "@/app/actions/moving";
import { formatIDRFull } from "@/lib/format";
import type { AdminMovingTruckClass } from "@/lib/api/moving";

export function MovingTruckClassDetailView({ truckClass: initialTruckClass }: { truckClass: AdminMovingTruckClass }) {
  const router = useRouter();
  const [truckClass, setTruckClass] = useState(initialTruckClass);
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [deletePending, startDeleteTransition] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function handleSaved(fresh: AdminMovingTruckClass) {
    setTruckClass(fresh);
    setMode("view");
  }

  function handleDelete() {
    if (!window.confirm(`Hapus tipe truk "${truckClass.name}"? Tindakan ini tidak dapat dibatalkan.`)) return;
    setDeleteError(null);
    startDeleteTransition(async () => {
      const result = await deleteMovingTruckClassAction(truckClass.id);
      if (!result.ok) {
        setDeleteError(result.error);
        return;
      }
      router.push("/moving/truck-classes");
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-primary">{truckClass.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{truckClass.slug}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={truckClass.isActive ? "default" : "secondary"}>
            {truckClass.isActive ? "Aktif" : "Nonaktif"}
          </Badge>
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
        <MovingTruckClassForm mode="edit" truckClass={truckClass} onSaved={handleSaved} onCancel={() => setMode("view")} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-6 lg:col-span-2">
            <DetailCard title="Gambar">
              {truckClass.image ? (
                <div className="relative aspect-video w-full max-w-sm overflow-hidden rounded-md bg-muted">
                  <Image
                    src={truckClass.image.url}
                    alt={truckClass.image.alt ?? truckClass.name}
                    fill
                    className="object-cover"
                    sizes="384px"
                  />
                </div>
              ) : (
                <div className="flex aspect-video w-full max-w-sm items-center justify-center rounded-md border border-dashed border-border text-muted-foreground">
                  <ImageOff className="size-6" />
                </div>
              )}
            </DetailCard>

            <DetailCard title="Deskripsi">
              <RichTextView html={truckClass.description} />
            </DetailCard>

            {(truckClass.capacityKg != null || truckClass.volumeM3 != null || truckClass.dimensions || truckClass.helperCount != null) && (
              <DetailCard title="Kapasitas">
                {truckClass.capacityKg != null && <DetailRow label="Kapasitas" value={`${truckClass.capacityKg} kg`} />}
                {truckClass.volumeM3 != null && <DetailRow label="Volume" value={`${truckClass.volumeM3} m³`} />}
                {truckClass.dimensions && (
                  <DetailRow
                    label="Dimensi bak"
                    value={`${truckClass.dimensions.lengthCm} × ${truckClass.dimensions.widthCm} × ${truckClass.dimensions.heightCm} cm`}
                  />
                )}
                {truckClass.helperCount != null && <DetailRow label="Helper" value={`${truckClass.helperCount} orang`} />}
              </DetailCard>
            )}
          </div>

          <div className="flex flex-col gap-6">
            <DetailCard title="Harga">
              <DetailRow label="Tarif dasar" value={formatIDRFull(truckClass.baseFare)} />
              <DetailRow label="Tarif per km" value={formatIDRFull(truckClass.perKmFare)} />
              <DetailRow
                label="Km termasuk"
                value={truckClass.includedKm != null ? `${truckClass.includedKm} km` : "Default pengaturan"}
              />
              {truckClass.minFare != null && <DetailRow label="Tarif minimum" value={formatIDRFull(truckClass.minFare)} />}
              <DetailRow label="Urutan" value={truckClass.sortOrder} />
            </DetailCard>

            <div className="rounded-lg border border-destructive/30 p-4">
              <h2 className="text-sm font-semibold text-destructive">Hapus tipe truk</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Lead yang sudah masuk menyimpan salinan data truk sendiri dan tidak terpengaruh oleh penghapusan ini.
              </p>
              <Button
                variant="outlineSecondary"
                className="mt-3 border-destructive/40 text-destructive hover:bg-destructive/10"
                onClick={handleDelete}
                disabled={deletePending}
              >
                <Trash2 className="size-4" />
                {deletePending ? "Menghapus…" : "Hapus tipe truk"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
