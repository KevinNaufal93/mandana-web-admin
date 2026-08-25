"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { ImageOff, Upload, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { uploadMediaAction, deleteMediaAction } from "@/app/actions/media";
import type { MediaPurpose } from "@/lib/api/media";

export interface ImagePickerValue {
  mediaAssetId: string | null;
  /** For rendering only. On create this comes from the upload response;
   *  on edit it starts as the entity's existing `image`. */
  preview: { url: string; alt: string | null } | null;
}

/**
 * A controlled input whose value is a `mediaAssetId` — it never talks to
 * the category/item entity at all, which is what makes it work equally
 * on the create page (no entity id exists yet) and the edit form.
 *
 * Preview after a fresh upload comes from a local `URL.createObjectURL`,
 * never from the upload response. POST /admin/media/upload's response is
 * the raw MediaAsset entity — its `variants` map holds storage KEYS, not
 * URLs (see lib/api/media.ts's UploadedMedia doc comment) — turning one
 * into a real URL requires a server-side read that hasn't happened yet.
 * The object URL is revoked once it's superseded (a re-pick, a remove,
 * or unmount) — see the effect and handlers below.
 *
 * Orphan policy (deliberately not "clean up on unmount" — see below):
 *  - Replacing or clearing an id THIS COMPONENT uploaded → delete the old
 *    asset first. Caps an abandoned form at one orphan no matter how many
 *    times the user re-picks.
 *  - Clearing an image on an ALREADY-SAVED entity → never delete the
 *    asset (it may still be referenced until the parent form's PATCH
 *    actually saves, and could be shared); just null the id.
 *  - Abandoning the create page entirely → accept the orphan.
 *    beforeunload/sendBeacon don't fire on client-side navigation, can't
 *    carry a Bearer token, and a delete-on-unmount would race the create
 *    POST and risk deleting an asset that WAS just attached. One orphaned
 *    image per abandoned form is a server-side GC concern, not a
 *    correctness one — do not "fix" this with an unload handler.
 */
export function ImagePicker({
  value,
  onChange,
  purpose = "cover",
  disabled,
  label = "Gambar",
}: {
  value: ImagePickerValue;
  onChange: (next: ImagePickerValue) => void;
  purpose?: MediaPurpose;
  disabled?: boolean;
  label?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [alt, setAlt] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Ids this component itself uploaded this mount — only these are safe
  // to delete when superseded or cleared before the parent form saves.
  const sessionUploads = useRef<Set<string>>(new Set());
  // The object URL currently backing `value.preview.url`, if we created
  // one — tracked so it can be revoked exactly once, when superseded.
  const blobUrlRef = useRef<string | null>(null);
  const disabledAll = pending || disabled;

  // Revoke on unmount — the only case not already covered by an explicit
  // replace/remove below.
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, []);

  function handleUpload() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError("Pilih file gambar terlebih dahulu.");
      return;
    }
    const formData = new FormData();
    formData.set("file", file);
    formData.set("purpose", purpose);
    if (alt.trim()) formData.set("alt", alt.trim());

    // Built up front from the local file — the upload response carries no
    // renderable URL (see this file's header comment), so this is the
    // only source for an immediate preview.
    const localUrl = URL.createObjectURL(file);
    const previousId = value.mediaAssetId;
    setError(null);
    startTransition(async () => {
      const result = await uploadMediaAction(formData);
      if (!result.ok) {
        URL.revokeObjectURL(localUrl);
        setError(result.error);
        return;
      }
      if (previousId && sessionUploads.current.has(previousId)) {
        sessionUploads.current.delete(previousId);
        void deleteMediaAction(previousId);
      }
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = localUrl;
      sessionUploads.current.add(result.data.id);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setAlt("");
      onChange({ mediaAssetId: result.data.id, preview: { url: localUrl, alt: result.data.alt } });
    });
  }

  function handleRemove() {
    const id = value.mediaAssetId;
    setError(null);
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    if (id && sessionUploads.current.has(id)) {
      sessionUploads.current.delete(id);
      startTransition(async () => {
        await deleteMediaAction(id);
        onChange({ mediaAssetId: null, preview: null });
      });
      return;
    }
    // Already-saved entity's image — never delete the asset here; the
    // PATCH that persists this null is what actually detaches it.
    onChange({ mediaAssetId: null, preview: null });
  }

  return (
    <div>
      <Label>{label}</Label>

      {error && (
        <p role="alert" className="mt-1.5 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="mt-1.5">
        {value.preview ? (
          <div className="flex items-start gap-3">
            <div className="relative size-24 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
              <Image
                src={value.preview.url}
                alt={value.preview.alt ?? ""}
                fill
                className="object-cover"
                sizes="96px"
                // A freshly-uploaded preview is a blob: object URL, which
                // Next's built-in loader can't fetch/optimize (it only
                // handles local paths and whitelisted remote hosts) —
                // unoptimized renders it as a plain <img> instead. Saved
                // entities' real https:// URLs skip this and optimize
                // normally.
                unoptimized={value.preview.url.startsWith("blob:")}
              />
            </div>
            <Button
              type="button"
              variant="outlineSecondary"
              size="sm"
              onClick={handleRemove}
              disabled={disabledAll}
            >
              <X className="size-3.5" />
              Hapus gambar
            </Button>
          </div>
        ) : (
          <div className="flex aspect-video max-w-xs items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground">
            <ImageOff className="size-6" />
          </div>
        )}

        {!disabled && (
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" disabled={disabledAll} />
            </div>
            <div className="flex-1">
              <Input
                value={alt}
                onChange={(e) => setAlt(e.target.value)}
                placeholder="Teks alternatif (opsional)"
                disabled={disabledAll}
              />
            </div>
            <Button type="button" variant="secondary" onClick={handleUpload} disabled={disabledAll} className="shrink-0">
              <Upload className="size-4" />
              {pending ? "Mengunggah…" : value.preview ? "Ganti" : "Unggah"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
