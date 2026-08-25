"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { ImageOff, Star, Trash2, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  uploadPropertyImageAction,
  updatePropertyImageAction,
  deletePropertyImageAction,
  type PropertyMutationResult,
} from "@/app/actions/properties";
import type { AdminPropertyDetail, AdminPropertyImage } from "@/lib/api/properties";

/**
 * Always-active image CRUD panel — unlike the rest of the detail page,
 * this isn't gated behind an "edit mode" toggle. Every control here
 * (upload, alt text, set cover, delete) is a single deliberate action
 * with its own immediate effect, not a draft that needs a separate
 * "Save".
 */
export function PropertyImagesManager({
  propertyId,
  images,
  title,
  locked,
  onChange,
}: {
  propertyId: string;
  images: AdminPropertyImage[];
  title: string;
  /** Published properties are locked — see PropertyDetailView. Images are
   *  still shown, just without any of the controls. */
  locked: boolean;
  onChange: (fresh: AdminPropertyDetail) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [uploadAlt, setUploadAlt] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const disabled = pending || locked;

  const sorted = [...images].sort((a, b) => Number(b.isCover) - Number(a.isCover) || a.sortOrder - b.sortOrder);

  function run(task: () => Promise<PropertyMutationResult>) {
    setError(null);
    startTransition(async () => {
      const result = await task();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onChange(result.data);
    });
  }

  function handleUpload() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError("Pilih file gambar terlebih dahulu.");
      return;
    }
    const formData = new FormData();
    formData.set("file", file);
    if (uploadAlt.trim()) formData.set("alt", uploadAlt.trim());
    formData.set("sortOrder", String(images.length));
    // First image uploaded to a property automatically becomes the cover.
    formData.set("isCover", String(images.length === 0));

    setError(null);
    startTransition(async () => {
      const result = await uploadPropertyImageAction(propertyId, formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setUploadAlt("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      onChange(result.data);
    });
  }

  function handleSetCover(imageId: string) {
    run(() => updatePropertyImageAction(propertyId, imageId, { isCover: true }));
  }

  function handleAltSave(imageId: string, alt: string) {
    run(() => updatePropertyImageAction(propertyId, imageId, { alt: alt.trim() || null }));
  }

  function handleDelete(imageId: string) {
    if (!window.confirm("Hapus gambar ini? Tindakan ini tidak dapat dibatalkan.")) return;
    run(() => deletePropertyImageAction(propertyId, imageId));
  }

  return (
    <div className="rounded-lg border border-border p-4">
      <h2 className="text-sm font-semibold text-primary">Gambar</h2>

      {error && (
        <div role="alert" className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {sorted.length === 0 ? (
        <div className="mt-3 flex aspect-video items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground">
          <ImageOff className="size-8" />
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {sorted.map((img) => (
            <ImageCard
              key={img.id}
              image={img}
              title={title}
              disabled={disabled}
              onSetCover={() => handleSetCover(img.id)}
              onAltSave={(alt) => handleAltSave(img.id, alt)}
              onDelete={() => handleDelete(img.id)}
            />
          ))}
        </div>
      )}

      {locked ? (
        <p className="mt-4 border-t border-border pt-4 text-sm text-muted-foreground">
          Arsipkan atau jadikan draf properti ini terlebih dahulu untuk mengelola gambar.
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled} />
          </div>
          <div className="flex-1">
            <Input
              value={uploadAlt}
              onChange={(e) => setUploadAlt(e.target.value)}
              placeholder="Teks alternatif (opsional)"
              disabled={disabled}
            />
          </div>
          <Button variant="secondary" onClick={handleUpload} disabled={disabled} className="shrink-0">
            <Upload className="size-4" />
            {pending ? "Mengunggah…" : "Unggah"}
          </Button>
        </div>
      )}
    </div>
  );
}

function ImageCard({
  image,
  title,
  disabled,
  onSetCover,
  onAltSave,
  onDelete,
}: {
  image: AdminPropertyImage;
  title: string;
  disabled: boolean;
  onSetCover: () => void;
  onAltSave: (alt: string) => void;
  onDelete: () => void;
}) {
  const [alt, setAlt] = useState(image.alt ?? "");

  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative aspect-video overflow-hidden rounded-md border border-border bg-muted">
        <Image src={image.url} alt={image.alt ?? title} fill className="object-cover" sizes="200px" />
        {image.isCover && (
          <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded bg-primary/85 px-1.5 py-0.5 text-[10px] font-medium text-card">
            <Star className="size-2.5 fill-current" />
            Sampul
          </span>
        )}
      </div>

      <input
        value={alt}
        onChange={(e) => setAlt(e.target.value)}
        onBlur={() => {
          if (alt.trim() !== (image.alt ?? "")) onAltSave(alt);
        }}
        placeholder="Teks alternatif"
        disabled={disabled}
        className="h-7 rounded-md border border-primary bg-background px-2 text-xs text-primary placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      />

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onSetCover}
          disabled={disabled || image.isCover}
          className={cn(
            "flex-1 rounded-md border border-border px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-muted",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          {image.isCover ? "Sampul" : "Jadikan sampul"}
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={disabled}
          aria-label="Hapus gambar"
          className="flex size-7 shrink-0 items-center justify-center rounded-md border border-destructive/30 text-destructive transition-colors hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
