"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { ImagePicker, type ImagePickerValue } from "@/components/media/image-picker";
import { createArticleAction, updateArticleAction } from "@/app/actions/articles";
import { ARTICLE_STATUSES, type ArticleStatus } from "@/lib/articles/query";
import type { AdminArticleCategory, AdminArticleDetail, ArticleCreateInput } from "@/lib/api/articles";

const STATUS_LABEL: Record<ArticleStatus, string> = {
  draft: "Draf",
  published: "Terbit",
  archived: "Arsip",
};

const EXCERPT_MAX = 300;
const META_TITLE_MAX = 255;
const META_DESCRIPTION_MAX = 300;
const SLUG_RE = /^[a-z0-9-]+$/;

function Field({
  label,
  htmlFor,
  children,
  className,
  hint,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
  hint?: string;
}) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor}>{label}</Label>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

type ArticleFormProps =
  | { mode: "create"; categories: AdminArticleCategory[] }
  | {
      mode: "edit";
      categories: AdminArticleCategory[];
      article: AdminArticleDetail;
      onSaved: (fresh: AdminArticleDetail) => void;
      onCancel: () => void;
    };

/**
 * One component for create and edit — the field set is identical except
 * `status`, which only appears in create mode. Articles have no
 * event-item-style draft-only edit lock, but status still moves out of
 * the edit form specifically: ArticlesService.update() only stamps
 * `editedAt` (rendered publicly as "last updated") when a non-status
 * field changes on an already-published article, so publish/archive/
 * draft actions must send a status-only PATCH — see
 * ArticleDetailView's status buttons, which call
 * updateArticleStatusAction directly rather than going through this form.
 */
export function ArticleForm(props: ArticleFormProps) {
  const router = useRouter();
  const article = props.mode === "edit" ? props.article : null;
  // The one 409 this module has: changing slug while status is
  // "published" (ArticlesService.update()'s wasAlreadyPublished guard).
  // Only reachable in edit mode — create has no prior slug to collide
  // with, so this never applies there.
  const slugLocked = props.mode === "edit" && article!.status === "published";

  const [categoryId, setCategoryId] = useState(article?.category.id ?? props.categories[0]?.id ?? "");
  const [title, setTitle] = useState(article?.title ?? "");
  const [slug, setSlug] = useState(article?.slug ?? "");
  const [excerpt, setExcerpt] = useState(article?.excerpt ?? "");
  const [bodyHtml, setBodyHtml] = useState(article?.bodyHtml ?? "");
  const [status, setStatus] = useState<ArticleStatus>("draft");
  const [metaTitle, setMetaTitle] = useState(article?.metaTitle ?? "");
  const [metaDescription, setMetaDescription] = useState(article?.metaDescription ?? "");
  const [cover, setCover] = useState<ImagePickerValue>({
    mediaAssetId: null,
    preview: article?.coverImage ? { url: article.coverImage.url, alt: article.coverImage.alt } : null,
  });

  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit() {
    setError(null);
    setConflict(false);

    if (!categoryId) {
      setError("Pilih kategori terlebih dahulu.");
      return;
    }
    if (title.trim().length < 2) {
      setError("Judul minimal 2 karakter.");
      return;
    }
    if (slug.trim() && !SLUG_RE.test(slug.trim())) {
      setError("Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung.");
      return;
    }
    if (excerpt.trim().length < 2) {
      setError("Ringkasan minimal 2 karakter.");
      return;
    }
    if (!bodyHtml.trim()) {
      setError("Isi artikel tidak boleh kosong.");
      return;
    }

    const input: ArticleCreateInput = {
      categoryId,
      title: title.trim(),
      slug: slug.trim() || undefined,
      excerpt: excerpt.trim(),
      bodyHtml,
      status: props.mode === "create" ? status : undefined,
      coverMediaAssetId: cover.mediaAssetId ?? undefined,
      metaTitle: metaTitle.trim() || undefined,
      metaDescription: metaDescription.trim() || undefined,
    };

    startTransition(async () => {
      if (props.mode === "edit") {
        // slug omitted entirely while locked, not just disabled in the
        // UI — never sends the field the API would 409 on.
        const patch = slugLocked ? { ...input, slug: undefined } : input;
        const result = await updateArticleAction(props.article.id, patch);
        if (!result.ok) {
          setError(result.error);
          setConflict(Boolean(result.conflict));
          return;
        }
        props.onSaved(result.data);
        return;
      }
      const result = await createArticleAction(input);
      if (!result.ok) {
        setError(result.error);
        setConflict(Boolean(result.conflict));
        return;
      }
      router.push(`/articles/posts/${result.data.id}`);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <div
          role="alert"
          className={
            conflict
              ? "rounded-lg border border-accent/60 bg-accent/10 p-3 text-sm text-primary"
              : "rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
          }
        >
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
            <Field label="Judul" htmlFor="article-title">
              <Input id="article-title" value={title} onChange={(e) => setTitle(e.target.value)} disabled={pending} />
            </Field>
            <Field
              label="Slug (opsional)"
              htmlFor="article-slug"
              hint={
                slugLocked
                  ? "Artikel ini sudah terbit — jadikan draf atau arsipkan terlebih dahulu untuk mengubah slug (melindungi tautan dan peringkat pencarian yang sudah ada)."
                  : "Dibuat otomatis dari judul bila dikosongkan."
              }
            >
              <Input
                id="article-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                disabled={pending || slugLocked}
              />
            </Field>
          </div>

          <div className="rounded-lg border border-border p-4">
            <Label htmlFor="article-excerpt">Ringkasan</Label>
            <div className="mt-1.5">
              <Textarea
                id="article-excerpt"
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value.slice(0, EXCERPT_MAX))}
                maxLength={EXCERPT_MAX}
                placeholder="Ringkasan singkat yang tampil di kartu artikel…"
                disabled={pending}
              />
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
              <p>Ditulis manual, bukan hasil potongan otomatis dari isi artikel — juga jadi cadangan meta description.</p>
              <p className="shrink-0 tabular-nums">
                {excerpt.length}/{EXCERPT_MAX}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-border p-4">
            <Label>Isi artikel</Label>
            <div className="mt-1.5">
              <RichTextEditor
                defaultValue={bodyHtml}
                onChange={setBodyHtml}
                placeholder="Tulis isi artikel…"
                disabled={pending}
                // Inline body images stay off here: the allow-listed <img>
                // support exists (see RichTextEditor's allowImages doc
                // comment) but GET /admin/media/:id can't yet resolve a
                // real URL to insert. Flip this on once that one-line
                // backend change ships.
              />
            </div>
          </div>

          <div className="rounded-lg border border-border p-4">
            <ImagePicker
              value={cover}
              onChange={setCover}
              purpose="hero"
              label="Gambar sampul"
              hint="Rasio 16:9 disarankan (mis. 1920×1080). JPG, PNG, atau WebP."
              disabled={pending}
            />
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
            <Field label="Kategori" htmlFor="article-category">
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger id="article-category" className="w-full" disabled={pending}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {props.categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {props.mode === "create" && (
              <Field label="Status" htmlFor="article-status">
                <Select value={status} onValueChange={(v) => setStatus(v as ArticleStatus)}>
                  <SelectTrigger id="article-status" className="w-full" disabled={pending}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ARTICLE_STATUSES.filter((s) => s !== "archived").map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
            <h2 className="text-sm font-semibold text-primary">SEO</h2>
            <Field label="Meta title (opsional)" htmlFor="article-meta-title" hint="Kosongkan untuk memakai Judul.">
              <Input
                id="article-meta-title"
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value.slice(0, META_TITLE_MAX))}
                maxLength={META_TITLE_MAX}
                disabled={pending}
              />
            </Field>
            <Field
              label="Meta description (opsional)"
              htmlFor="article-meta-description"
              hint="Kosongkan untuk memakai Ringkasan."
            >
              <Textarea
                id="article-meta-description"
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value.slice(0, META_DESCRIPTION_MAX))}
                maxLength={META_DESCRIPTION_MAX}
                disabled={pending}
              />
            </Field>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="secondary" onClick={handleSubmit} disabled={pending}>
          {props.mode === "edit" ? (pending ? "Menyimpan…" : "Simpan perubahan") : pending ? "Membuat…" : "Buat artikel"}
        </Button>
        <Button
          variant="outlineSecondary"
          onClick={() => (props.mode === "edit" ? props.onCancel() : router.push("/articles/posts"))}
          disabled={pending}
        >
          Batal
        </Button>
      </div>
    </div>
  );
}
