"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ImagePicker, type ImagePickerValue } from "@/components/media/image-picker";
import { ContentBlockPreview } from "@/components/content-media/content-block-preview";
import { createContentBlockAction, updateContentBlockAction, deleteContentBlockAction } from "@/app/actions/content-blocks";
import type { AdminContentBlock, ContentBlockInput } from "@/lib/api/content-blocks";
import type { ContentBlockTypeDef } from "@/lib/content-blocks/types";
import { LISTING_TYPES, type ListingType } from "@/lib/properties/query";
import { LISTING_LABEL } from "@/components/properties/property-status-badge";

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div>
      <Label htmlFor={htmlFor}>{label}</Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

const HERO_IMAGE_COPY = "Slide hero wajib memiliki gambar. Unggah gambar terlebih dahulu.";
const IMAGE_ONLY_COPY = "Mode gambar saja membutuhkan gambar. Unggah gambar terlebih dahulu.";

type ContentBlockFormProps =
  | { mode: "create"; typeDef: ContentBlockTypeDef; nextSortOrder: number }
  | { mode: "edit"; typeDef: ContentBlockTypeDef; block: AdminContentBlock };

/**
 * One component for create and edit, same convention as
 * event-category-form.tsx. Unlike that pattern in storage/event-support,
 * there is no separate read-only detail-view here — the list page's
 * <ContentBlockPreview> already serves as the "view" for a saved block —
 * so the [id] route renders this component directly, in place, instead
 * of toggling between a view mode and an edit mode.
 */
export function ContentBlockForm(props: ContentBlockFormProps) {
  const router = useRouter();
  const { typeDef } = props;
  const [block, setBlock] = useState<AdminContentBlock | null>(props.mode === "edit" ? props.block : null);

  const [title, setTitle] = useState(block?.title ?? "");
  const [subtitle, setSubtitle] = useState(block?.subtitle ?? "");
  const [ctaText, setCtaText] = useState(block?.ctaText ?? "");
  const [link, setLink] = useState(block?.link ?? "");
  const [isActive, setIsActive] = useState(block?.isActive ?? true);
  const [imageOnly, setImageOnly] = useState(block?.imageOnly ?? false);
  // null and [] both mean "every listing type" (doc §4b) — collapse
  // either into the same empty-array UI state; handleSubmit re-expands an
  // empty selection back to null on submit.
  const [scope, setScope] = useState<ListingType[]>(block?.listingTypeScope ?? []);
  const [image, setImage] = useState<ImagePickerValue>({
    mediaAssetId: null,
    preview: block?.image ? { url: block.image.url, alt: block.image.alt } : null,
  });

  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const [deletePending, startDeleteTransition] = useTransition();

  function toggleScope(listingType: ListingType) {
    setScope((prev) => (prev.includes(listingType) ? prev.filter((v) => v !== listingType) : [...prev, listingType]));
  }

  function handleSubmit() {
    setError(null);
    setSaved(false);

    if (title.trim().length < 2) {
      setError("Judul minimal 2 karakter.");
      return;
    }

    // mediaAssetId semantics: <ImagePicker>'s value is null both when an
    // existing image is left untouched AND when it has been deliberately
    // cleared — only `preview` tells the two apart (see its own header
    // comment). A fresh upload always wins; an explicit clear on a block
    // that had an image sends `null`; anything else omits the key so the
    // current image is left alone.
    const hadImage = block?.image != null;
    const cleared = hadImage && image.preview === null;
    const willHaveImage = image.mediaAssetId !== null || (hadImage && !cleared);
    if (typeDef.requiresImage && !willHaveImage) {
      setError(HERO_IMAGE_COPY);
      return;
    }
    if (imageOnly && !willHaveImage) {
      setError(IMAGE_ONLY_COPY);
      return;
    }

    const input: ContentBlockInput = {
      title: title.trim(),
      subtitle: subtitle.trim() || undefined,
      ...(typeDef.usesCtaText ? { ctaText: ctaText.trim() || undefined } : {}),
      link: link.trim() || undefined,
      isActive,
      ...(typeDef.supportsImageOnly ? { imageOnly } : {}),
      // Always send the key (never omit) so clearing the scope back to
      // "every listing type" actually reaches the API — omitting it
      // would leave the previous scope untouched instead (doc §4b).
      ...(typeDef.supportsListingTypeScope ? { listingTypeScope: scope.length ? scope : null } : {}),
      ...(image.mediaAssetId ? { mediaAssetId: image.mediaAssetId } : cleared ? { mediaAssetId: null } : {}),
    };

    startTransition(async () => {
      if (props.mode === "edit") {
        const result = await updateContentBlockAction(props.block.id, input);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setBlock(result.data);
        setSaved(true);
        return;
      }

      // Re-listing `title` after the spread (not just relying on `input`)
      // keeps its inferred type as the definite `string` from `.trim()`,
      // rather than widening to ContentBlockInput's optional `title?:
      // string` — that widening is exactly what CreateContentBlockInput's
      // required `title` rejects.
      const result = await createContentBlockAction({
        ...input,
        title: title.trim(),
        type: typeDef.type,
        sortOrder: props.nextSortOrder,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/content-media/${typeDef.slug}/${result.data.id}`);
    });
  }

  function handleDelete() {
    if (props.mode !== "edit") return;
    if (!window.confirm(`Hapus "${props.block.title}"? Tindakan ini tidak dapat dibatalkan.`)) return;
    setError(null);
    startDeleteTransition(async () => {
      const result = await deleteContentBlockAction(props.block.id, typeDef.type);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/content-media/${typeDef.slug}`);
    });
  }

  // Soft hint, not a validation block: the public promo card only renders
  // its CTA button when both ctaText AND link are present (mandana-web's
  // promo-card.tsx) — filling in one without the other silently drops the
  // button rather than erroring, so surface that here instead of letting
  // it be a surprise on the live site.
  const missingCtaLink = typeDef.type === "property_promo" && ctaText.trim() !== "" && link.trim() === "";

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {saved && !error && <p className="text-sm text-muted-foreground">Tersimpan.</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
            {imageOnly && (
              <p className="text-xs text-muted-foreground">
                Mode gambar saja aktif — judul dan deskripsi tidak tampil di halaman utama, hanya dipakai sebagai
                label internal dan teks alternatif gambar.
              </p>
            )}
            <Field label="Judul" htmlFor="block-title">
              <Input id="block-title" value={title} onChange={(e) => setTitle(e.target.value)} disabled={pending} />
            </Field>
            <Field label={typeDef.subtitleLabel} htmlFor="block-subtitle">
              <Textarea
                id="block-subtitle"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                rows={3}
                disabled={pending}
              />
            </Field>
            {typeDef.usesCtaText && (
              <Field label="Teks tombol CTA" htmlFor="block-cta-text">
                <Input
                  id="block-cta-text"
                  value={ctaText}
                  onChange={(e) => setCtaText(e.target.value)}
                  placeholder="Lihat Properti"
                  disabled={pending}
                />
              </Field>
            )}
            <Field label={typeDef.linkLabel} htmlFor="block-link">
              <Input
                id="block-link"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder={typeDef.linkPlaceholder}
                disabled={pending}
              />
            </Field>
            {missingCtaLink && (
              <p className="text-xs text-muted-foreground">
                Tombol CTA tidak akan tampil tanpa {typeDef.linkLabel.toLowerCase()} — isi tautannya di atas.
              </p>
            )}
          </div>

          <div className="rounded-lg border border-border p-4">
            {/* key remounts the picker after a successful save so its
                internal session-upload tracking resets — otherwise an
                image just attached by THIS save could still read as an
                orphan this component uploaded if cleared moments later in
                the same visit. Same remount-to-reset idiom this repo
                already uses for RichTextEditor (see its header comment). */}
            <ImagePicker
              key={block?.updatedAt}
              value={image}
              onChange={setImage}
              purpose={typeDef.mediaPurpose}
              disabled={pending}
              allowClear={!typeDef.requiresImage}
              label={typeDef.requiresImage ? "Gambar (wajib)" : "Gambar (opsional)"}
            />
          </div>

          <div className="rounded-lg border border-border p-4">
            <label className="flex items-center gap-2 text-sm text-primary">
              <input
                type="checkbox"
                className="accent-primary"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                disabled={pending}
              />
              Aktif (tampil di situs)
            </label>
          </div>

          {typeDef.supportsListingTypeScope && (
            <div className="rounded-lg border border-border p-4">
              <p className="text-sm font-medium text-primary">Tampilkan pada tipe listing</p>
              <div className="mt-2 flex flex-wrap gap-4">
                {LISTING_TYPES.map((listingType) => (
                  <label key={listingType} className="flex items-center gap-2 text-sm text-primary">
                    <input
                      type="checkbox"
                      className="accent-primary"
                      checked={scope.includes(listingType)}
                      onChange={() => toggleScope(listingType)}
                      disabled={pending}
                    />
                    {LISTING_LABEL[listingType]}
                  </label>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Kosongkan untuk menampilkan kartu di semua tipe listing.
              </p>
            </div>
          )}

          {typeDef.supportsImageOnly && (
            <div className="rounded-lg border border-border p-4">
              <label className="flex items-center gap-2 text-sm text-primary">
                <input
                  type="checkbox"
                  className="accent-primary"
                  checked={imageOnly}
                  onChange={(e) => setImageOnly(e.target.checked)}
                  disabled={pending}
                />
                Tampilkan sebagai gambar saja
              </label>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Judul dan deskripsi tidak akan tampil di halaman utama — gunakan gambar yang sudah memuat teksnya
                sendiri.
              </p>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={handleSubmit} disabled={pending}>
              {props.mode === "edit"
                ? pending
                  ? "Menyimpan…"
                  : "Simpan perubahan"
                : pending
                  ? "Membuat…"
                  : `Buat ${typeDef.label.toLowerCase()}`}
            </Button>
            <Button variant="outlineSecondary" onClick={() => router.push(`/content-media/${typeDef.slug}`)} disabled={pending}>
              Batal
            </Button>
          </div>

          {props.mode === "edit" && (
            <div className="rounded-lg border border-destructive/30 p-4">
              <h2 className="text-sm font-semibold text-destructive">Hapus {typeDef.label.toLowerCase()}</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Gambar yang terpasang tidak ikut terhapus — tetap tersedia di pustaka media.
              </p>
              <Button
                variant="outlineSecondary"
                className="mt-3 border-destructive/40 text-destructive hover:bg-destructive/10"
                onClick={handleDelete}
                disabled={deletePending}
              >
                <Trash2 className="size-4" />
                {deletePending ? "Menghapus…" : `Hapus ${typeDef.label.toLowerCase()}`}
              </Button>
            </div>
          )}
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pratinjau langsung</p>
          <ContentBlockPreview
            typeDef={typeDef}
            data={{
              title,
              subtitle: subtitle || null,
              ctaText: typeDef.usesCtaText ? ctaText || null : null,
              isActive,
              imageOnly: typeDef.supportsImageOnly && imageOnly,
              image: image.preview,
            }}
          />
        </div>
      </div>
    </div>
  );
}
