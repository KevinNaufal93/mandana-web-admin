"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DetailCard, DetailRow } from "@/components/ui/detail-card";
import { ArticleCategoryForm } from "@/components/articles/article-category-form";
import { deleteArticleCategoryAction } from "@/app/actions/articles";
import { formatDateID } from "@/lib/format";
import type { AdminArticleCategory } from "@/lib/api/articles";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";

export function ArticleCategoryDetailView({ category: initialCategory }: { category: AdminArticleCategory }) {
  const router = useRouter();
  const [category, setCategory] = useState(initialCategory);
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [deletePending, startDeleteTransition] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteConflict, setDeleteConflict] = useState(false);
  const { confirm, dialog } = useConfirmDialog();

  function handleSaved(fresh: AdminArticleCategory) {
    setCategory(fresh);
    setMode("view");
  }

  async function handleDelete() {
    const ok = await confirm({
      title: `Hapus kategori "${category.name}"?`,
      description: "Tindakan ini tidak dapat dibatalkan.",
      confirmLabel: "Hapus",
      variant: "destructive",
    });
    if (!ok) return;
    setDeleteError(null);
    setDeleteConflict(false);
    startDeleteTransition(async () => {
      const result = await deleteArticleCategoryAction(category.id);
      if (!result.ok) {
        setDeleteError(result.error);
        setDeleteConflict(Boolean(result.conflict));
        return;
      }
      router.push("/articles/categories");
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-primary">{category.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{category.slug}</p>
        </div>
        {mode === "view" && (
          <Button variant="secondary" onClick={() => setMode("edit")}>
            <Pencil className="size-4" />
            Edit
          </Button>
        )}
      </div>

      {mode === "edit" ? (
        <ArticleCategoryForm mode="edit" category={category} onSaved={handleSaved} onCancel={() => setMode("view")} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-6 lg:col-span-2">
            <DetailCard title="Metadata">
              <DetailRow label="Dibuat" value={formatDateID(category.createdAt)} />
              <DetailRow label="Diperbarui" value={formatDateID(category.updatedAt)} />
            </DetailCard>
          </div>

          <div className="flex flex-col gap-6">
            <div className="rounded-lg border border-destructive/30 p-4">
              <h2 className="text-sm font-semibold text-destructive">Hapus kategori</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Kategori dengan artikel di dalamnya tidak dapat dihapus — pindahkan atau hapus artikelnya terlebih
                dahulu.
              </p>
              {deleteError && (
                <p
                  role="alert"
                  className={deleteConflict ? "mt-2 text-sm text-primary" : "mt-2 text-sm text-destructive"}
                >
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
                {deletePending ? "Menghapus…" : "Hapus kategori"}
              </Button>
            </div>
          </div>
        </div>
      )}
      {dialog}
    </div>
  );
}
