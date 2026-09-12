"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ImageOff, Pencil, Trash2 } from "lucide-react";
import { ArticleStatusBadge } from "@/components/articles/article-status-badge";
import { ArticleForm } from "@/components/articles/article-form";
import { DetailCard, DetailRow } from "@/components/ui/detail-card";
import { RichTextView } from "@/components/ui/rich-text-view";
import { Button } from "@/components/ui/button";
import { updateArticleStatusAction, deleteArticleAction } from "@/app/actions/articles";
import { formatDateID } from "@/lib/format";
import type { AdminArticleCategory, AdminArticleDetail } from "@/lib/api/articles";
import type { ArticleStatus } from "@/lib/articles/query";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";

export function ArticleDetailView({
  article: initialArticle,
  categories,
}: {
  article: AdminArticleDetail;
  categories: AdminArticleCategory[];
}) {
  const router = useRouter();
  const [article, setArticle] = useState(initialArticle);
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [transitionPending, startTransitionTransition] = useTransition();
  const [transitionError, setTransitionError] = useState<string | null>(null);
  const [deletePending, startDeleteTransition] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const { confirm, dialog } = useConfirmDialog();

  // Adjusting state during render on a fresh navigation, same pattern as
  // EventItemDetailView.
  const [syncedUpdatedAt, setSyncedUpdatedAt] = useState(initialArticle.updatedAt);
  if (initialArticle.updatedAt !== syncedUpdatedAt || initialArticle.id !== article.id) {
    setSyncedUpdatedAt(initialArticle.updatedAt);
    setArticle(initialArticle);
    setMode("view");
  }

  function applyFresh(fresh: AdminArticleDetail) {
    setArticle(fresh);
    setSyncedUpdatedAt(fresh.updatedAt);
    setMode("view");
  }

  function handleTransition(status: ArticleStatus) {
    setTransitionError(null);
    startTransitionTransition(async () => {
      const result = await updateArticleStatusAction(article.id, status);
      if (!result.ok) {
        setTransitionError(result.error);
        return;
      }
      applyFresh(result.data);
    });
  }

  async function handleDelete() {
    const ok = await confirm({
      title: `Hapus artikel "${article.title}"?`,
      description:
        article.status === "published"
          ? "Artikel ini sudah terbit — menghapusnya akan mematahkan tautan yang mengarah ke sini dan menghilangkan peringkat pencariannya. Tindakan ini tidak dapat dibatalkan. Pertimbangkan mengarsipkan alih-alih menghapus."
          : "Tindakan ini tidak dapat dibatalkan.",
      confirmLabel: "Hapus",
      variant: "destructive",
    });
    if (!ok) return;
    setDeleteError(null);
    startDeleteTransition(async () => {
      const result = await deleteArticleAction(article.id);
      if (!result.ok) {
        setDeleteError(result.error);
        return;
      }
      router.push("/articles/posts");
    });
  }

  const effectiveMetaTitle = article.metaTitle || article.title;
  const effectiveMetaDescription = article.metaDescription || article.excerpt;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-primary">{article.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{article.slug}</p>
        </div>
        <div className="flex items-center gap-2">
          <ArticleStatusBadge status={article.status} />
          {mode === "view" && (
            <Button variant="secondary" onClick={() => setMode("edit")}>
              <Pencil className="size-4" />
              Edit
            </Button>
          )}
        </div>
      </div>

      {mode === "view" && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-4">
          {article.status === "draft" && (
            <>
              <Button variant="secondary" size="sm" onClick={() => handleTransition("published")} disabled={transitionPending}>
                Terbitkan
              </Button>
              <Button variant="outlineSecondary" size="sm" onClick={() => handleTransition("archived")} disabled={transitionPending}>
                Arsipkan
              </Button>
            </>
          )}
          {article.status === "published" && (
            <>
              <Button variant="secondary" size="sm" onClick={() => handleTransition("draft")} disabled={transitionPending}>
                Jadikan draf
              </Button>
              <Button variant="outlineSecondary" size="sm" onClick={() => handleTransition("archived")} disabled={transitionPending}>
                Arsipkan
              </Button>
            </>
          )}
          {article.status === "archived" && (
            <>
              <Button variant="secondary" size="sm" onClick={() => handleTransition("published")} disabled={transitionPending}>
                Terbitkan
              </Button>
              <Button variant="outlineSecondary" size="sm" onClick={() => handleTransition("draft")} disabled={transitionPending}>
                Jadikan draf
              </Button>
            </>
          )}
        </div>
      )}

      {transitionError && (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {transitionError}
        </div>
      )}

      {mode === "edit" ? (
        <ArticleForm
          mode="edit"
          article={article}
          categories={categories}
          onSaved={applyFresh}
          onCancel={() => setMode("view")}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-6 lg:col-span-2">
            <DetailCard title="Gambar sampul">
              {article.coverImage ? (
                <div className="relative aspect-video w-full max-w-sm overflow-hidden rounded-md bg-muted">
                  <Image
                    src={article.coverImage.url}
                    alt={article.coverImage.alt ?? article.title}
                    fill
                    className="object-cover"
                    sizes="384px"
                  />
                </div>
              ) : (
                <div className="flex aspect-video w-full max-w-sm items-center justify-center rounded-md border border-dashed border-border text-muted-foreground">
                  <ImageOff className="size-6" />
                </div>
              )}
            </DetailCard>

            <DetailCard title="Ringkasan">
              <p className="text-sm leading-relaxed text-primary">{article.excerpt}</p>
            </DetailCard>

            <DetailCard title="Isi artikel">
              <RichTextView html={article.bodyHtml} />
            </DetailCard>
          </div>

          <div className="flex flex-col gap-6">
            <DetailCard title="Metadata">
              <DetailRow
                label="Kategori"
                value={
                  <Link href={`/articles/categories/${article.category.id}`} className="hover:underline">
                    {article.category.name}
                  </Link>
                }
              />
              <DetailRow
                label="Penulis"
                value={
                  <span>
                    {article.author.name}
                    {article.author.role && <span className="block text-xs text-muted-foreground">{article.author.role}</span>}
                  </span>
                }
              />
              <DetailRow label="Waktu baca" value={`${article.readingMinutes} menit`} />
              <DetailRow label="Dibuat" value={formatDateID(article.createdAt)} />
              <DetailRow label="Terbit" value={article.publishedAt ? formatDateID(article.publishedAt) : "Belum pernah terbit"} />
              <DetailRow label="Diperbarui" value={article.updatedAt ? formatDateID(article.updatedAt) : "—"} />
            </DetailCard>

            <DetailCard title="SEO" tone="readonly">
              <DetailRow
                label="Meta title"
                value={
                  <span className="text-right">
                    {effectiveMetaTitle}
                    {!article.metaTitle && <span className="block text-xs text-muted-foreground">(dari Judul)</span>}
                  </span>
                }
              />
              <DetailRow
                label="Meta description"
                value={
                  <span className="text-right">
                    {effectiveMetaDescription}
                    {!article.metaDescription && <span className="block text-xs text-muted-foreground">(dari Ringkasan)</span>}
                  </span>
                }
              />
            </DetailCard>

            <div className="rounded-lg border border-destructive/30 p-4">
              <h2 className="text-sm font-semibold text-destructive">Hapus artikel</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {article.status === "published"
                  ? "Artikel yang sudah terbit kehilangan tautan dan peringkat pencariannya saat dihapus — pertimbangkan mengarsipkan alih-alih menghapus."
                  : "Artikel dapat dihapus kapan saja — tidak ada pemeriksaan referensi pada modul ini."}
              </p>
              {deleteError && (
                <p role="alert" className="mt-2 text-sm text-destructive">
                  {deleteError}
                </p>
              )}
              <Button
                variant="outlineSecondary"
                className="mt-3 border-destructive/40 text-destructive hover:bg-destructive/10"
                onClick={handleDelete}
                disabled={deletePending}
              >
                <Trash2 className="size-4" />
                {deletePending ? "Menghapus…" : "Hapus artikel"}
              </Button>
            </div>
          </div>
        </div>
      )}
      {dialog}
    </div>
  );
}
