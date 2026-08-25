"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DetailCard, DetailRow } from "@/components/ui/detail-card";
import { RichTextView } from "@/components/ui/rich-text-view";
import { EventCategoryForm } from "@/components/event-support/event-category-form";
import { deleteEventCategoryAction } from "@/app/actions/event-support";
import type { AdminEventCategory } from "@/lib/api/event-support";

export function EventCategoryDetailView({ category: initialCategory }: { category: AdminEventCategory }) {
  const router = useRouter();
  const [category, setCategory] = useState(initialCategory);
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [deletePending, startDeleteTransition] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function handleSaved(fresh: AdminEventCategory) {
    setCategory(fresh);
    setMode("view");
  }

  function handleDelete() {
    if (!window.confirm(`Hapus kategori "${category.name}"? Tindakan ini tidak dapat dibatalkan.`)) return;
    setDeleteError(null);
    startDeleteTransition(async () => {
      const result = await deleteEventCategoryAction(category.id);
      if (!result.ok) {
        setDeleteError(result.error);
        return;
      }
      router.push("/event-support/categories");
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-primary">{category.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{category.slug}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={category.isActive ? "default" : "secondary"}>{category.isActive ? "Aktif" : "Nonaktif"}</Badge>
          {mode === "view" && (
            <Button variant="secondary" onClick={() => setMode("edit")}>
              <Pencil className="size-4" />
              Edit
            </Button>
          )}
        </div>
      </div>

      {deleteError && (
        <p role="alert" className="text-sm text-destructive">
          {deleteError}
        </p>
      )}

      {mode === "edit" ? (
        <EventCategoryForm mode="edit" category={category} onSaved={handleSaved} onCancel={() => setMode("view")} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-6 lg:col-span-2">
            <DetailCard title="Deskripsi">
              <RichTextView html={category.description} />
            </DetailCard>
          </div>

          <div className="flex flex-col gap-6">
            <DetailCard title="Detail">
              <DetailRow label="Jumlah item" value={category.itemCount} />
              <DetailRow label="Urutan" value={category.sortOrder} />
            </DetailCard>

            <div className="rounded-lg border border-destructive/30 p-4">
              <h2 className="text-sm font-semibold text-destructive">Hapus kategori</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Kategori dengan item di dalamnya tidak dapat dihapus — pindahkan atau hapus itemnya terlebih
                dahulu.
              </p>
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
    </div>
  );
}
