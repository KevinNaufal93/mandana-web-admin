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

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div>
      <Label htmlFor={htmlFor}>{label}</Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

const HERO_IMAGE_COPY = "Slide hero wajib memiliki gambar. Unggah gambar terlebih dahulu.";

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
  const [image, setImage] = useState<ImagePickerValue>({
    mediaAssetId: null,
    preview: block?.image ? { url: block.image.url, alt: block.image.alt } : null,
  });

  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const [deletePending, startDeleteTransition] = useTransition();

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

    const input: ContentBlockInput = {
      title: title.trim(),
      subtitle: subtitle.trim() || undefined,
      ...(typeDef.usesCtaText ? { ctaText: ctaText.trim() || undefined } : {}),
      link: link.trim() || undefined,
      isActive,
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
              Aktif (tampil di homepage)
            </label>
          </div>

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
              image: image.preview,
            }}
          />
        </div>
      </div>
    </div>
  );
}
