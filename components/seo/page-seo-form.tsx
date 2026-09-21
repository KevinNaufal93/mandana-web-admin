"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ImagePicker, type ImagePickerValue } from "@/components/media/image-picker";
import { SeoFields } from "@/components/seo/seo-fields";
import { updatePageSeoAction } from "@/app/actions/seo";
import { SEO_PAGE_META, type AdminPageSeo, type SeoPageKey } from "@/lib/seo/shared";

export function PageSeoForm({ pageKey, page }: { pageKey: SeoPageKey; page: AdminPageSeo }) {
  const meta = SEO_PAGE_META[pageKey];

  const [metaTitle, setMetaTitle] = useState(page.metaTitle ?? "");
  const [metaDescription, setMetaDescription] = useState(page.metaDescription ?? "");
  const [heading, setHeading] = useState(page.heading ?? "");
  const [noIndex, setNoIndex] = useState(page.noIndex);
  const [ogImage, setOgImage] = useState<ImagePickerValue>({
    mediaAssetId: null,
    preview: page.ogImage ? { url: page.ogImage.url, alt: page.ogImage.alt } : null,
  });

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit() {
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const result = await updatePageSeoAction(pageKey, {
        metaTitle: metaTitle.trim(),
        metaDescription: metaDescription.trim(),
        heading: heading.trim(),
        // Only ever sent for a hideable page — the field doesn't render
        // at all for `home` below, so `noIndex` state there never leaves
        // its initial `false`.
        ...(meta.canHide ? { noIndex } : {}),
        ogMediaAssetId: ogImage.mediaAssetId ?? undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess(true);
    });
  }

  return (
    <div className="flex flex-col gap-6 rounded-lg border border-border p-4">
      {error && (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {success && !pending && (
        <p role="status" className="text-sm text-primary">
          Perubahan tersimpan.
        </p>
      )}

      <SeoFields
        idPrefix={`page-seo-${pageKey}`}
        title={metaTitle}
        onTitleChange={(v) => {
          setMetaTitle(v);
          setSuccess(false);
        }}
        titlePlaceholder={meta.titleDefault}
        description={metaDescription}
        onDescriptionChange={(v) => {
          setMetaDescription(v);
          setSuccess(false);
        }}
        descriptionPlaceholder={meta.descriptionDefault}
        previewUrl={`mandana.id${meta.path === "/" ? "" : meta.path}`}
        disabled={pending}
      />

      {pageKey === "home" && (
        <div>
          <Label htmlFor="page-seo-home-heading">Judul halaman (H1)</Label>
          <Input
            id="page-seo-home-heading"
            value={heading}
            onChange={(e) => {
              setHeading(e.target.value);
              setSuccess(false);
            }}
            placeholder="Judul tersembunyi yang dibaca Google di balik hero bergambar"
            disabled={pending}
            className="mt-1.5"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Tidak tampil secara visual di beranda — hero saat ini berupa gambar tanpa teks asli, jadi ini satu-satunya
            judul utama yang bisa dibaca Google di halaman ini. Tulis dalam Bahasa Indonesia, sesuai kata yang
            dicari pelanggan.
          </p>
        </div>
      )}

      <div>
        <ImagePicker
          value={ogImage}
          onChange={(next) => {
            setOgImage(next);
            setSuccess(false);
          }}
          purpose="cover"
          label="Gambar berbagi (opsional)"
          hint="Disarankan 1200 × 630 px. Format JPG, PNG, atau WebP, maksimal 4 MB. Kosongkan untuk memakai gambar bawaan situs."
          disabled={pending}
        />
      </div>

      {meta.canHide && (
        <div className="flex items-start gap-2">
          <Checkbox
            id="page-seo-no-index"
            checked={noIndex}
            onChange={(e) => {
              setNoIndex(e.target.checked);
              setSuccess(false);
            }}
            disabled={pending}
          />
          <div>
            <Label htmlFor="page-seo-no-index">Sembunyikan dari Google</Label>
            <p className="text-xs text-muted-foreground">
              Halaman tetap bisa diakses, tapi diberi tanda &ldquo;jangan tampilkan di hasil pencarian&rdquo;.
            </p>
          </div>
        </div>
      )}

      <div>
        <Button variant="secondary" onClick={handleSubmit} disabled={pending}>
          {pending ? "Menyimpan…" : "Simpan perubahan"}
        </Button>
      </div>
    </div>
  );
}
