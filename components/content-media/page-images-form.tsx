"use client";

import { useState, useTransition } from "react";
import { ImagePicker, type ImagePickerValue } from "@/components/media/image-picker";
import { Button } from "@/components/ui/button";
import { updatePageImageAction } from "@/app/actions/page-images";
import type { AdminPageImage } from "@/lib/api/page-images";
import type { PageImagePageMeta } from "@/lib/page-images/shared";

interface PageImagesFormProps {
  page: PageImagePageMeta;
  images: AdminPageImage[];
}

function initialValue(image: AdminPageImage | undefined): ImagePickerValue {
  return {
    mediaAssetId: null,
    preview: image?.image ? { url: image.image.url, alt: image.image.alt } : null,
  };
}

/**
 * One form for all of a page's fixed image slots, saved together — same
 * shape as seo-settings-form.tsx's single "Simpan perubahan" button, not
 * content-block-form.tsx's per-row create/edit/delete (there's nothing to
 * create or delete here, every slot always exists).
 */
export function PageImagesForm({ page, images }: PageImagesFormProps) {
  const byKey = new Map(images.map((i) => [i.slotKey, i]));
  const [values, setValues] = useState<Record<string, ImagePickerValue>>(() =>
    Object.fromEntries(page.slots.map((slot) => [slot.key, initialValue(byKey.get(slot.key))])),
  );
  // Bumped after every successful save so <ImagePicker key> remounts and
  // resets its session-upload tracking — same idiom content-block-form.tsx
  // uses via `block?.updatedAt`, adapted since this form has no single
  // "the record" updatedAt to key off of.
  const [savedAt, setSavedAt] = useState(() => Date.now());

  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit() {
    setError(null);
    setSaved(false);

    startTransition(async () => {
      const nextValues: Record<string, ImagePickerValue> = { ...values };
      let hadError: string | null = null;

      // Every slot is its own PATCH — no bulk endpoint. mediaAssetId
      // semantics mirror content-block-form.tsx's tri-state: a fresh
      // upload always wins; an existing image explicitly cleared sends
      // null; an untouched slot is skipped entirely rather than re-sent.
      await Promise.all(
        page.slots.map(async (slot) => {
          const existing = byKey.get(slot.key);
          const value = values[slot.key];
          const hadImage = existing?.image != null;
          const cleared = hadImage && value.preview === null;

          if (value.mediaAssetId === null && !cleared) return;

          const result = await updatePageImageAction(slot.key, value.mediaAssetId);
          if (!result.ok) {
            hadError = result.error;
            return;
          }
          nextValues[slot.key] = {
            mediaAssetId: null,
            preview: result.data.image ? { url: result.data.image.url, alt: result.data.image.alt } : null,
          };
        }),
      );

      if (hadError) {
        setError(hadError);
        return;
      }
      setValues(nextValues);
      setSavedAt(Date.now());
      setSaved(true);
    });
  }

  return (
    <div className="flex flex-col gap-6 rounded-lg border border-border p-4">
      {error && (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {saved && !error && (
        <p role="status" className="text-sm text-primary">
          Perubahan tersimpan.
        </p>
      )}

      {page.slots.map((slot) => (
        <div key={slot.key} className="rounded-lg border border-border p-4">
          <ImagePicker
            key={`${slot.key}-${savedAt}`}
            value={values[slot.key]}
            onChange={(next) => {
              setValues((prev) => ({ ...prev, [slot.key]: next }));
              setSaved(false);
            }}
            purpose={slot.mediaPurpose}
            label={slot.label}
            hint={slot.imageGuidance}
            disabled={pending}
          />
        </div>
      ))}

      <div>
        <Button variant="secondary" onClick={handleSubmit} disabled={pending}>
          {pending ? "Menyimpan…" : "Simpan perubahan"}
        </Button>
      </div>
    </div>
  );
}
