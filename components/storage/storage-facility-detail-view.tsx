"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ImageOff, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DetailCard, DetailRow } from "@/components/ui/detail-card";
import { RichTextView } from "@/components/ui/rich-text-view";
import { StorageFacilityForm } from "@/components/storage/storage-facility-form";
import { deleteStorageFacilityAction } from "@/app/actions/storage";
import { composeLocation } from "@/lib/format";
import type { AdminStorageFacility } from "@/lib/api/storage";

export function StorageFacilityDetailView({ facility: initialFacility }: { facility: AdminStorageFacility }) {
  const router = useRouter();
  const [facility, setFacility] = useState(initialFacility);
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [deletePending, startDeleteTransition] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function handleSaved(fresh: AdminStorageFacility) {
    setFacility(fresh);
    setMode("view");
  }

  function handleDelete() {
    if (!window.confirm(`Hapus fasilitas "${facility.name}"? Tindakan ini tidak dapat dibatalkan.`)) return;
    setDeleteError(null);
    startDeleteTransition(async () => {
      const result = await deleteStorageFacilityAction(facility.id);
      if (!result.ok) {
        setDeleteError(result.error);
        return;
      }
      router.push("/storage/facilities");
    });
  }

  const location = composeLocation(facility);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-primary">{facility.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{facility.slug}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={facility.isActive ? "default" : "secondary"}>{facility.isActive ? "Aktif" : "Nonaktif"}</Badge>
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
        <StorageFacilityForm mode="edit" facility={facility} onSaved={handleSaved} onCancel={() => setMode("view")} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-6 lg:col-span-2">
            <DetailCard title="Gambar">
              {facility.image ? (
                <div className="relative aspect-video w-full max-w-sm overflow-hidden rounded-md bg-muted">
                  <Image src={facility.image.url} alt={facility.image.alt ?? facility.name} fill className="object-contain" sizes="384px" />
                </div>
              ) : (
                <div className="flex aspect-video w-full max-w-sm items-center justify-center rounded-md border border-dashed border-border text-muted-foreground">
                  <ImageOff className="size-6" />
                </div>
              )}
            </DetailCard>

            <DetailCard title="Deskripsi">
              <RichTextView html={facility.description} />
            </DetailCard>
          </div>

          <div className="flex flex-col gap-6">
            <DetailCard title="Detail">
              <DetailRow label="Alamat" value={facility.address ?? "—"} />
              <DetailRow label="Lokasi" value={location || "—"} />
              {facility.latitude != null && facility.longitude != null && (
                <DetailRow label="Koordinat" value={`${facility.latitude}, ${facility.longitude}`} />
              )}
              <DetailRow label="Urutan" value={facility.sortOrder} />
            </DetailCard>

            <div className="rounded-lg border border-destructive/30 p-4">
              <h2 className="text-sm font-semibold text-destructive">Hapus fasilitas</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Fasilitas dengan inventaris atau unit di dalamnya tidak dapat dihapus — hapus itu terlebih
                dahulu.
              </p>
              <Button
                variant="outlineSecondary"
                className="mt-3 border-destructive/40 text-destructive hover:bg-destructive/10"
                onClick={handleDelete}
                disabled={deletePending}
              >
                <Trash2 className="size-4" />
                {deletePending ? "Menghapus…" : "Hapus fasilitas"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
