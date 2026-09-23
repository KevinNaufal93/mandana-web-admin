"use client";

import { useState, useTransition } from "react";
import { ImagePicker, type ImagePickerValue } from "@/components/media/image-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div>
      <Label htmlFor={htmlFor}>{label}</Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
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
 *
 * Slots with `supportsHeading` get a heading/subtitle pair + an "imageOnly"
 * checkbox, mirroring content-block-form.tsx's hero title/subtitle/
 * imageOnly UI — but simpler: these are plain controlled text fields with
 * no upload-in-flight ambiguity, so (unlike the image pickers above) there
 * is no tri-state to track. An empty box always means "use the web
 * component's own hardcoded copy" (sent as `null`), not "leave whatever
 * was there before" — the field's current value fully describes what to
 * save.
 */
export function PageImagesForm({ page, images }: PageImagesFormProps) {
  const byKey = new Map(images.map((i) => [i.slotKey, i]));
  const [values, setValues] = useState<Record<string, ImagePickerValue>>(() =>
    Object.fromEntries(page.slots.map((slot) => [slot.key, initialValue(byKey.get(slot.key)?.image)])),
  );
  const [mobileValues, setMobileValues] = useState<Record<string, ImagePickerValue>>(() =>
    Object.fromEntries(page.slots.map((slot) => [slot.key, initialValue(byKey.get(slot.key)?.mobileImage)])),
  );
  const [headingValues, setHeadingValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(page.slots.map((slot) => [slot.key, byKey.get(slot.key)?.heading ?? ""])),
  );
  const [subtitleValues, setSubtitleValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(page.slots.map((slot) => [slot.key, byKey.get(slot.key)?.subtitle ?? ""])),
  );
  const [imageOnlyValues, setImageOnlyValues] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(page.slots.map((slot) => [slot.key, byKey.get(slot.key)?.imageOnly ?? false])),
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
      // the same request. heading/subtitle/imageOnly are always included
      // (when supportsHeading) since they have no untouched/tri-state case.
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
            ...(slot.supportsHeading
              ? {
                  heading: headingValues[slot.key].trim() || null,
                  subtitle: subtitleValues[slot.key].trim() || null,
                  imageOnly: imageOnlyValues[slot.key],
                }
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

          {slot.supportsHeading && (
            <>
              {imageOnlyValues[slot.key] && (
                <p className="text-xs text-muted-foreground">
                  Mode gambar saja aktif — judul dan subjudul di bawah tidak tampil di halaman, hanya tersimpan
                  sebagai catatan internal.
                </p>
              )}
              <Field label="Judul" htmlFor={`${slot.key}-heading`}>
                <Input
                  id={`${slot.key}-heading`}
                  value={headingValues[slot.key]}
                  onChange={(e) => {
                    setHeadingValues((prev) => ({ ...prev, [slot.key]: e.target.value }));
                    setSaved(false);
                  }}
                  placeholder="Menemani Setiap Langkah Menuju Rumah."
                  disabled={pending}
                />
              </Field>
              <Field label="Subjudul" htmlFor={`${slot.key}-subtitle`}>
                <Textarea
                  id={`${slot.key}-subtitle`}
                  value={subtitleValues[slot.key]}
                  onChange={(e) => {
                    setSubtitleValues((prev) => ({ ...prev, [slot.key]: e.target.value }));
                    setSaved(false);
                  }}
                  rows={3}
                  disabled={pending}
                />
              </Field>
              <p className="text-xs text-muted-foreground">Kosongkan judul/subjudul untuk memakai teks bawaan.</p>
              <label className="flex items-center gap-2 text-sm text-primary">
                <input
                  type="checkbox"
                  className="accent-primary"
                  checked={imageOnlyValues[slot.key]}
                  onChange={(e) => {
                    setImageOnlyValues((prev) => ({ ...prev, [slot.key]: e.target.checked }));
                    setSaved(false);
                  }}
                  disabled={pending}
                />
                Tampilkan sebagai gambar saja
              </label>
              <p className="text-xs text-muted-foreground">
                Judul dan subjudul di atas tidak akan tampil — gunakan gambar yang sudah memuat teksnya sendiri.
              </p>
            </>
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
