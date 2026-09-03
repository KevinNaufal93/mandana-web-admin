"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ImageOff, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DetailCard, DetailRow } from "@/components/ui/detail-card";
import { RichTextView } from "@/components/ui/rich-text-view";
import { MovingAddonForm } from "@/components/moving/moving-addon-form";
import { deleteMovingAddonAction } from "@/app/actions/moving";
import { formatIDRFull } from "@/lib/format";
import type { AdminMovingAddon } from "@/lib/api/moving";

const KIND_LABEL: Record<string, string> = {
  helper: "Helper",
  packaging: "Packaging",
  waiting: "Waiting",
  insurance: "Insurance",
  toll: "Toll",
  other: "Lainnya",
};

const PRICING_MODEL_LABEL: Record<string, string> = {
  flat: "Flat (sekali bayar)",
  per_unit: "Per unit (dikali kuantitas)",
  percent: "Persen (dari nilai barang)",
};

export function MovingAddonDetailView({ addon: initialAddon }: { addon: AdminMovingAddon }) {
  const router = useRouter();
  const [addon, setAddon] = useState(initialAddon);
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [deletePending, startDeleteTransition] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function handleSaved(fresh: AdminMovingAddon) {
    setAddon(fresh);
    setMode("view");
  }

  function handleDelete() {
    if (!window.confirm(`Hapus add-on "${addon.name}"? Tindakan ini tidak dapat dibatalkan.`)) return;
    setDeleteError(null);
    startDeleteTransition(async () => {
      const result = await deleteMovingAddonAction(addon.id);
      if (!result.ok) {
        setDeleteError(result.error);
        return;
      }
      router.push("/moving/addons");
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-primary">{addon.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{addon.slug}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={addon.isActive ? "default" : "secondary"}>{addon.isActive ? "Aktif" : "Nonaktif"}</Badge>
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
        <MovingAddonForm mode="edit" addon={addon} onSaved={handleSaved} onCancel={() => setMode("view")} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-6 lg:col-span-2">
            <DetailCard title="Gambar">
              {addon.image ? (
                <div className="relative aspect-video w-full max-w-sm overflow-hidden rounded-md bg-muted">
                  <Image src={addon.image.url} alt={addon.image.alt ?? addon.name} fill className="object-cover" sizes="384px" />
                </div>
              ) : (
                <div className="flex aspect-video w-full max-w-sm items-center justify-center rounded-md border border-dashed border-border text-muted-foreground">
                  <ImageOff className="size-6" />
                </div>
              )}
            </DetailCard>

            <DetailCard title="Deskripsi">
              <RichTextView html={addon.description} />
            </DetailCard>
          </div>

          <div className="flex flex-col gap-6">
            <DetailCard title="Harga">
              <DetailRow label="Jenis" value={KIND_LABEL[addon.kind] ?? addon.kind} />
              <DetailRow label="Model harga" value={PRICING_MODEL_LABEL[addon.pricingModel] ?? addon.pricingModel} />
              {addon.pricingModel === "percent" ? (
                <DetailRow label="Persentase" value={`${((addon.percentBps ?? 0) / 100).toFixed(2)}%`} />
              ) : (
                <DetailRow label="Harga satuan" value={formatIDRFull(addon.unitPrice)} />
              )}
              {addon.minCharge != null && <DetailRow label="Batas bawah" value={formatIDRFull(addon.minCharge)} />}
              {addon.maxCharge != null && <DetailRow label="Batas atas" value={formatIDRFull(addon.maxCharge)} />}
              {addon.unitLabel && <DetailRow label="Label satuan" value={addon.unitLabel} />}
              {addon.kind !== "toll" && (
                <DetailRow label="Kuantitas" value={`${addon.minQty} – ${addon.maxQty}`} />
              )}
              <DetailRow label="Dobel PP" value={addon.doublesOnRoundTrip ? "Ya" : "Tidak"} />
              <DetailRow label="Urutan" value={addon.sortOrder} />
            </DetailCard>

            {addon.kind === "toll" && (
              <p className="text-xs text-muted-foreground">
                Add-on jenis Toll diterapkan otomatis oleh sistem saat pelanggan memilih rute tol — tidak pernah
                dipilih langsung sebagai checkbox.
              </p>
            )}

            <div className="rounded-lg border border-destructive/30 p-4">
              <h2 className="text-sm font-semibold text-destructive">Hapus add-on</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Lead yang sudah masuk menyimpan salinan harga add-on sendiri dan tidak terpengaruh oleh penghapusan ini.
              </p>
              <Button
                variant="outlineSecondary"
                className="mt-3 border-destructive/40 text-destructive hover:bg-destructive/10"
                onClick={handleDelete}
                disabled={deletePending}
              >
                <Trash2 className="size-4" />
                {deletePending ? "Menghapus…" : "Hapus add-on"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
