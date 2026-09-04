"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ImageOff, Lock, Pencil, Trash2, TriangleAlert } from "lucide-react";
import { EventItemStatusBadge, EventItemKindBadge } from "@/components/event-support/event-item-status-badge";
import { EventItemForm } from "@/components/event-support/event-item-form";
import { DetailCard, DetailRow } from "@/components/ui/detail-card";
import { RichTextView } from "@/components/ui/rich-text-view";
import { Button } from "@/components/ui/button";
import { updateEventItemStatusAction, deleteEventItemAction } from "@/app/actions/event-support";
import { formatIDRFull, formatDateID } from "@/lib/format";
import type { AdminEventCategory, AdminEventItem } from "@/lib/api/event-support";
import type { EventItemStatus } from "@/lib/event-support/query";

export function EventItemDetailView({
  item: initialItem,
  categories,
}: {
  item: AdminEventItem;
  categories: AdminEventCategory[];
}) {
  const router = useRouter();
  const [item, setItem] = useState(initialItem);
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [transitionPending, startTransitionTransition] = useTransition();
  const [transitionError, setTransitionError] = useState<string | null>(null);
  const [transitionConflict, setTransitionConflict] = useState(false);
  const [deletePending, startDeleteTransition] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // `status !== "draft"`, not properties' `=== "published"` — this API
  // 409s a PATCH on BOTH published and archived items, and status is not
  // even a field on this DTO (it has its own endpoint below).
  const locked = item.status !== "draft";

  // Adjusting state during render on a fresh navigation, same pattern as
  // PropertyDetailView.
  const [syncedUpdatedAt, setSyncedUpdatedAt] = useState(initialItem.updatedAt);
  if (initialItem.updatedAt !== syncedUpdatedAt || initialItem.id !== item.id) {
    setSyncedUpdatedAt(initialItem.updatedAt);
    setItem(initialItem);
    setMode("view");
  }

  function applyFresh(fresh: AdminEventItem) {
    setItem(fresh);
    setSyncedUpdatedAt(fresh.updatedAt);
    setMode("view");
  }

  function handleSaved(fresh: AdminEventItem) {
    applyFresh(fresh);
  }

  function handleTransition(status: EventItemStatus) {
    setTransitionError(null);
    setTransitionConflict(false);
    startTransitionTransition(async () => {
      const result = await updateEventItemStatusAction(item.id, status);
      if (!result.ok) {
        setTransitionError(result.error);
        setTransitionConflict(Boolean(result.conflict));
        return;
      }
      applyFresh(result.data);
    });
  }

  function handleDelete() {
    if (!window.confirm(`Hapus item "${item.name}"? Tindakan ini tidak dapat dibatalkan.`)) return;
    setDeleteError(null);
    startDeleteTransition(async () => {
      const result = await deleteEventItemAction(item.id);
      if (!result.ok) {
        setDeleteError(result.error);
        return;
      }
      router.push("/event-support/items");
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-primary">{item.name}</h1>
            <EventItemKindBadge kind={item.kind} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{item.slug}</p>
        </div>
        <div className="flex items-center gap-2">
          <EventItemStatusBadge status={item.status} />
          {mode === "view" && item.status === "draft" && (
            <Button variant="secondary" onClick={() => setMode("edit")}>
              <Pencil className="size-4" />
              Edit
            </Button>
          )}
        </div>
      </div>

      {item.status === "published" && (
        <LifecycleBanner tone="accent" message='Item yang sudah "terbit" tidak dapat diedit. Jadikan draf terlebih dahulu untuk mengubah data atau gambar.'>
          <Button variant="secondary" size="sm" onClick={() => handleTransition("draft")} disabled={transitionPending}>
            Jadikan draf
          </Button>
          <Button variant="outlineSecondary" size="sm" onClick={() => handleTransition("archived")} disabled={transitionPending}>
            Arsipkan
          </Button>
        </LifecycleBanner>
      )}

      {item.status === "archived" && (
        <LifecycleBanner tone="muted" message="Item ini diarsipkan dan tidak tampil di situs. Untuk menerbitkannya kembali, jadikan draf terlebih dahulu.">
          <Button variant="secondary" size="sm" onClick={() => handleTransition("draft")} disabled={transitionPending}>
            Jadikan draf
          </Button>
        </LifecycleBanner>
      )}

      {item.status === "draft" && mode === "view" && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-4">
          <Button variant="secondary" size="sm" onClick={() => handleTransition("published")} disabled={transitionPending}>
            Terbitkan
          </Button>
          <Button variant="outlineSecondary" size="sm" onClick={() => handleTransition("archived")} disabled={transitionPending}>
            Arsipkan
          </Button>
        </div>
      )}

      {transitionError && (
        <div
          role="alert"
          className={
            transitionConflict
              ? "rounded-lg border border-accent/60 bg-accent/10 p-3 text-sm text-primary"
              : "rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
          }
        >
          {transitionConflict && <TriangleAlert className="mr-1.5 inline size-4 -translate-y-px text-accent-foreground" />}
          {transitionError}
        </div>
      )}

      {mode === "edit" && item.status === "draft" ? (
        <EventItemForm mode="edit" item={item} categories={categories} onSaved={handleSaved} onCancel={() => setMode("view")} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-6 lg:col-span-2">
            <DetailCard title="Gambar">
              {item.image ? (
                <div className="relative aspect-video w-full max-w-sm overflow-hidden rounded-md bg-muted">
                  <Image src={item.image.url} alt={item.image.alt ?? item.name} fill className="object-cover" sizes="384px" />
                </div>
              ) : (
                <div className="flex aspect-video w-full max-w-sm items-center justify-center rounded-md border border-dashed border-border text-muted-foreground">
                  <ImageOff className="size-6" />
                </div>
              )}
            </DetailCard>

            <DetailCard title="Deskripsi">
              <RichTextView html={item.description} />
            </DetailCard>

            {locked && (
              <p className="text-sm text-muted-foreground">
                {item.status === "published"
                  ? "Jadikan draf atau arsipkan terlebih dahulu untuk mengelola gambar."
                  : "Jadikan draf terlebih dahulu untuk mengelola gambar."}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-6">
            <DetailCard title="Spesifikasi">
              <DetailRow label="Kategori" value={<Link href={`/event-support/categories/${item.categoryId}`} className="hover:underline">{item.categoryName}</Link>} />
              <DetailRow label="Harga / hari" value={formatIDRFull(item.pricePerDay)} />
              {item.supportsHourly ? (
                <>
                  <DetailRow label="Harga / jam" value={item.hourlyRate != null ? formatIDRFull(item.hourlyRate) : "—"} />
                  <DetailRow
                    label="Minimum jam"
                    value={item.minimumHours != null ? `${item.minimumHours} jam` : "Default kebijakan"}
                  />
                </>
              ) : (
                <DetailRow label="Sewa per jam" value={<span className="text-muted-foreground">Hanya sewa harian</span>} />
              )}
              {/* stockQuantity is TOTAL inventory, not availability on a
                  given date — see the guide's availability model. Never
                  labelled "Tersedia". */}
              <DetailRow label="Stok total" value={item.stockQuantity} />
              <DetailRow label="Urutan" value={item.sortOrder} />
            </DetailCard>

            <DetailCard title="Metadata">
              <DetailRow label="Dibuat" value={formatDateID(item.createdAt)} />
              <DetailRow label="Diperbarui" value={formatDateID(item.updatedAt)} />
            </DetailCard>

            {(item.status === "draft" || item.status === "archived") && (
              <div className="rounded-lg border border-destructive/30 p-4">
                <h2 className="text-sm font-semibold text-destructive">Hapus item</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Item yang pernah dipakai pada pemesanan — termasuk yang sudah selesai atau dibatalkan — tidak
                  dapat dihapus; arsipkan saja.
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
                  {deletePending ? "Menghapus…" : "Hapus item"}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function LifecycleBanner({
  tone,
  message,
  children,
}: {
  tone: "accent" | "muted";
  message: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={
        tone === "accent"
          ? "flex flex-col gap-3 rounded-lg border border-accent/60 bg-accent/10 p-4 sm:flex-row sm:items-center sm:justify-between"
          : "flex flex-col gap-3 rounded-lg border border-border bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between"
      }
    >
      <p className="flex items-start gap-2 text-sm text-primary">
        <Lock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <span>{message}</span>
      </p>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </div>
  );
}
