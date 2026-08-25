"use client";

import Image from "next/image";
import { ImageOff, Star, Trash2, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { visibleSlots, type ImageDraft, type ImageSlot } from "@/lib/properties/image-staging";
import type { AdminPropertyImage } from "@/lib/api/properties";

function sortedByCover<T extends { isCover: boolean; sortOrder: number }>(images: T[]): T[] {
  return [...images].sort((a, b) => Number(b.isCover) - Number(a.isCover) || a.sortOrder - b.sortOrder);
}

/** Body of the "Gambar" DetailCard in view mode — a plain gallery, no
 *  controls. Editing lives in <PropertyImagesEditor> only, reached the
 *  same way every other field does: enter edit mode. */
export function PropertyImagesGallery({ images, title }: { images: AdminPropertyImage[]; title: string }) {
  const sorted = sortedByCover(images);

  if (sorted.length === 0) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground">
        <ImageOff className="size-8" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {sorted.map((img) => (
        <div key={img.id} className="relative aspect-video overflow-hidden rounded-md border border-border bg-muted">
          <Image src={img.url} alt={img.alt ?? title} fill className="object-cover" sizes="200px" />
          {img.isCover && <CoverBadge />}
        </div>
      ))}
    </div>
  );
}

/** Body of the "Gambar" DetailCard in edit mode. Everything here is
 *  staged — see lib/properties/image-staging.ts — nothing reaches the
 *  network until the page-level Save, unlike the always-committing panel
 *  this replaces. */
export function PropertyImagesEditor({
  draft,
  title,
  pending,
  onAddFile,
  onRemove,
  onSetCover,
  onAltChange,
}: {
  draft: ImageDraft;
  title: string;
  pending: boolean;
  onAddFile: (file: File) => void;
  onRemove: (key: string) => void;
  onSetCover: (key: string) => void;
  onAltChange: (key: string, alt: string) => void;
}) {
  const visible = visibleSlots(draft);
  const sorted = sortedByCoverSlot(visible, draft.coverKey);

  return (
    <div className="flex flex-col gap-3">
      {sorted.length === 0 ? (
        <div className="flex aspect-video items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground">
          <ImageOff className="size-8" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {sorted.map((slot) => (
            <ImageSlotCard
              key={slot.key}
              slot={slot}
              title={title}
              isCover={slot.key === draft.coverKey}
              pending={pending}
              onSetCover={() => onSetCover(slot.key)}
              onAltChange={(alt) => onAltChange(slot.key, alt)}
              onRemove={() => onRemove(slot.key)}
            />
          ))}
        </div>
      )}

      <label
        className={cn(
          "flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border py-3 text-sm font-medium text-primary transition-colors hover:bg-muted",
          pending && "pointer-events-none opacity-50",
        )}
      >
        <Upload className="size-4" />
        Tambah gambar
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          disabled={pending}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onAddFile(file);
            e.target.value = ""; // same file can be re-picked after being removed
          }}
        />
      </label>
      <p className="text-xs text-muted-foreground">
        Gambar baru diunggah, dan penghapusan diterapkan, saat kamu menekan Simpan perubahan.
      </p>
    </div>
  );
}

function sortedByCoverSlot(slots: ImageSlot[], coverKey: string | null): ImageSlot[] {
  return [...slots].sort((a, b) => Number(b.key === coverKey) - Number(a.key === coverKey));
}

function CoverBadge() {
  return (
    <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded bg-primary/85 px-1.5 py-0.5 text-[10px] font-medium text-card">
      <Star className="size-2.5 fill-current" />
      Sampul
    </span>
  );
}

function ImageSlotCard({
  slot,
  title,
  isCover,
  pending,
  onSetCover,
  onAltChange,
  onRemove,
}: {
  slot: ImageSlot;
  title: string;
  isCover: boolean;
  pending: boolean;
  onSetCover: () => void;
  onAltChange: (alt: string) => void;
  onRemove: () => void;
}) {
  const src = slot.kind === "existing" ? slot.image.url : slot.previewUrl;
  const alt = slot.alt || title;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative aspect-video overflow-hidden rounded-md border border-border bg-muted">
        {/* next/image can't optimize a blob: object URL — plain <img> for
            "new" slots is correct here, not a shortcut. */}
        {slot.kind === "new" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={alt} className="h-full w-full object-cover" />
        ) : (
          <Image src={src} alt={alt} fill className="object-cover" sizes="200px" />
        )}
        {isCover && <CoverBadge />}
        {slot.kind === "new" && (
          <span className="absolute right-1.5 top-1.5 rounded bg-accent/90 px-1.5 py-0.5 text-[10px] font-medium text-accent-foreground">
            Baru
          </span>
        )}
      </div>

      <Input
        value={slot.alt}
        onChange={(e) => onAltChange(e.target.value)}
        placeholder="Teks alternatif"
        disabled={pending}
        className="h-7 px-2 text-xs"
      />

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onSetCover}
          disabled={pending || isCover}
          className={cn(
            // Filled/tinted, not outline-on-transparent like the Input
            // above it — a button that borrows the text field's own surface
            // reads as "another field", not "an action to click". Cover-set
            // state gets the same tint CoverBadge uses on the thumbnail
            // itself, so "already the cover" reads as a status pill rather
            // than a disabled field.
            "flex flex-1 items-center justify-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed",
            isCover
              ? "border-primary/30 bg-primary/10 text-primary"
              : "border-border/60 bg-muted text-primary hover:bg-muted/70",
          )}
        >
          <Star className={cn("size-3", isCover && "fill-current")} />
          {isCover ? "Sampul" : "Jadikan sampul"}
        </button>
        <button
          type="button"
          onClick={onRemove}
          disabled={pending}
          aria-label="Hapus gambar"
          className="flex size-7 shrink-0 items-center justify-center rounded-md border border-destructive/30 bg-destructive/5 text-destructive transition-colors hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
