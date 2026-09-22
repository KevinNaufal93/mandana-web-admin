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

function initialValue(image: { url: string; alt: string | null } | null | undefined): ImagePickerValue {
  return {
    mediaAssetId: null,
    preview: image ? { url: image.url, alt: image.alt } : null,
  };
}

/**
 * One form for all of a page's fixed image slots, saved together — same
 * shape as seo-settings-form.tsx's single "Simpan perubahan" button, not
 * content-block-form.tsx's per-row create/edit/delete (there's nothing to
 * create or delete here, every slot always exists).
 *
 * Slots with `supportsMobileImage` (lib/page-images/shared.ts) get a
 * second <ImagePicker>, same shape as content-block-form.tsx's hero
 * mobileImage picker — its own `mobileValues` record, its own tri-state
 * clear/untouched tracking, saved in the SAME PATCH as the primary image
 * (one request per slot either way, not two).
 */
export function PageImagesForm({ page, images }: PageImagesFormProps) {
  const byKey = new Map(images.map((i) => [i.slotKey, i]));
  const [values, setValues] = useState<Record<string, ImagePickerValue>>(() =>
    Object.fromEntries(page.slots.map((slot) => [slot.key, initialValue(byKey.get(slot.key)?.image)])),
  );
  const [mobileValues, setMobileValues] = useState<Record<string, ImagePickerValue>>(() =>
    Object.fromEntries(page.slots.map((slot) => [slot.key, initialValue(byKey.get(slot.key)?.mobileImage)])),
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
      const nextMobileValues: Record<string, ImagePickerValue> = { ...mobileValues };
      let hadError: string | null = null;

      // Every slot is its own PATCH — no bulk endpoint. mediaAssetId/
      // mobileMediaAssetId semantics mirror content-block-form.tsx's
      // tri-state: a fresh upload always wins; an existing image
      // explicitly cleared sends null; an untouched picker omits the key
      // entirely rather than re-sending it. Both pickers of a slot go in
      // the same request.
      await Promise.all(
        page.slots.map(async (slot) => {
          const existing = byKey.get(slot.key);
          const value = values[slot.key];
          const hadImage = existing?.image != null;
          const cleared = hadImage && value.preview === null;

          const mobileValue = mobileValues[slot.key];
          const hadMobileImage = existing?.mobileImage != null;
          const mobileCleared = slot.supportsMobileImage && hadMobileImage && mobileValue.preview === null;

          const body = {
            ...(value.mediaAssetId ? { mediaAssetId: value.mediaAssetId } : cleared ? { mediaAssetId: null } : {}),
            ...(slot.supportsMobileImage
              ? mobileValue.mediaAssetId
                ? { mobileMediaAssetId: mobileValue.mediaAssetId }
                : mobileCleared
                  ? { mobileMediaAssetId: null }
                  : {}
              : {}),
          };
          if (Object.keys(body).length === 0) return;

          const result = await updatePageImageAction(slot.key, body);
          if (!result.ok) {
            hadError = result.error;
            return;
          }
          nextValues[slot.key] = initialValue(result.data.image);
          if (slot.supportsMobileImage) {
            nextMobileValues[slot.key] = initialValue(result.data.mobileImage);
          }
        }),
      );

      if (hadError) {
        setError(hadError);
        return;
      }
      setValues(nextValues);
      setMobileValues(nextMobileValues);
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
        <div key={slot.key} className="flex flex-col gap-4 rounded-lg border border-border p-4">
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

          {slot.supportsMobileImage && (
            <ImagePicker
              key={`${slot.key}-mobile-${savedAt}`}
              value={mobileValues[slot.key]}
              onChange={(next) => {
                setMobileValues((prev) => ({ ...prev, [slot.key]: next }));
                setSaved(false);
              }}
              purpose="hero_mobile"
              label="Gambar mobile (opsional)"
              hint={slot.mobileImageGuidance}
              disabled={pending}
              allowClear={true}
            />
          )}
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
