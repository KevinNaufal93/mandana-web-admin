"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { ImagePicker, type ImagePickerValue } from "@/components/media/image-picker";
import { createEventItemAction, updateEventItemAction } from "@/app/actions/event-support";
import { EVENT_ITEM_KINDS, type EventItemKind } from "@/lib/event-support/query";
import type { AdminEventCategory, AdminEventItem, EventItemCreateInput } from "@/lib/api/event-support";

const KIND_LABEL: Record<EventItemKind, string> = {
  package: "Paket",
  addon: "Add on",
};

function Field({
  label,
  htmlFor,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor}>{label}</Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

type EventItemFormProps =
  | { mode: "create"; categories: AdminEventCategory[] }
  | { mode: "edit"; categories: AdminEventCategory[]; item: AdminEventItem; onSaved: (fresh: AdminEventItem) => void; onCancel: () => void };

/**
 * One component for create and edit — the field set is identical either
 * way (POST and PATCH share every field except `status`, which lives on
 * neither: it only changes through PATCH /items/:id/status, rendered
 * separately in EventItemDetailView). Mode branching stays confined to
 * the useState seeds and handleSubmit.
 */
export function EventItemForm(props: EventItemFormProps) {
  const router = useRouter();
  const item = props.mode === "edit" ? props.item : null;

  const [categoryId, setCategoryId] = useState(item?.categoryId ?? props.categories[0]?.id ?? "");
  const [name, setName] = useState(item?.name ?? "");
  const [slug, setSlug] = useState(item?.slug ?? "");
  const [kind, setKind] = useState<EventItemKind>(item?.kind ?? "package");
  const [description, setDescription] = useState(item?.description ?? "");
  const [pricePerDay, setPricePerDay] = useState(item ? String(item.pricePerDay) : "");
  const [supportsHourly, setSupportsHourly] = useState(item?.supportsHourly ?? false);
  const [hourlyRate, setHourlyRate] = useState(item?.hourlyRate != null ? String(item.hourlyRate) : "");
  const [minimumHours, setMinimumHours] = useState(item?.minimumHours != null ? String(item.minimumHours) : "");
  const [stockQuantity, setStockQuantity] = useState(item ? String(item.stockQuantity) : "");
  const [sortOrder, setSortOrder] = useState(item ? String(item.sortOrder) : "0");
  const [image, setImage] = useState<ImagePickerValue>({
    mediaAssetId: null,
    preview: item?.image ? { url: item.image.url, alt: item.image.alt } : null,
  });

  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit() {
    setError(null);

    if (!categoryId) {
      setError("Pilih kategori terlebih dahulu.");
      return;
    }
    if (name.trim().length < 2) {
      setError("Nama minimal 2 karakter.");
      return;
    }
    const price = Number(pricePerDay);
    if (pricePerDay.trim() === "" || !Number.isInteger(price) || price < 0) {
      setError("Harga per hari harus berupa bilangan bulat (Rupiah), 0 atau lebih.");
      return;
    }
    let hourlyRateNumber: number | undefined;
    if (supportsHourly) {
      hourlyRateNumber = Number(hourlyRate);
      if (hourlyRate.trim() === "" || !Number.isInteger(hourlyRateNumber) || hourlyRateNumber <= 0) {
        setError("Harga per jam wajib diisi dan lebih dari 0 bila sewa per jam diaktifkan.");
        return;
      }
    }
    let minimumHoursNumber: number | undefined;
    if (minimumHours.trim() !== "") {
      minimumHoursNumber = Number(minimumHours);
      if (!Number.isInteger(minimumHoursNumber) || minimumHoursNumber < 1) {
        setError("Minimum jam harus berupa bilangan bulat 1 atau lebih.");
        return;
      }
    }
    const stock = Number(stockQuantity);
    if (stockQuantity.trim() === "" || !Number.isInteger(stock) || stock < 0) {
      setError("Stok harus berupa bilangan bulat 0 atau lebih.");
      return;
    }
    const sortOrderNumber = Number(sortOrder);
    if (!Number.isInteger(sortOrderNumber) || sortOrderNumber < 0) {
      setError("Urutan harus berupa bilangan bulat 0 atau lebih.");
      return;
    }

    const input: EventItemCreateInput = {
      categoryId,
      name: name.trim(),
      slug: slug.trim() || undefined,
      kind,
      description: description || undefined,
      pricePerDay: price,
      supportsHourly,
      hourlyRate: supportsHourly ? hourlyRateNumber : undefined,
      minimumHours: minimumHoursNumber,
      stockQuantity: stock,
      mediaAssetId: image.mediaAssetId ?? undefined,
      sortOrder: sortOrderNumber,
    };

    startTransition(async () => {
      if (props.mode === "edit") {
        const result = await updateEventItemAction(props.item.id, input);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        props.onSaved(result.data);
        return;
      }
      const result = await createEventItemAction(input);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/event-support/items/${result.data.id}`);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
            <Field label="Nama" htmlFor="item-name">
              <Input id="item-name" value={name} onChange={(e) => setName(e.target.value)} disabled={pending} />
            </Field>
            <Field label="Slug (opsional)" htmlFor="item-slug">
              <Input
                id="item-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="Dibuat otomatis dari nama bila dikosongkan"
                disabled={pending}
              />
            </Field>
          </div>

          <div className="rounded-lg border border-border p-4">
            <Label>Deskripsi</Label>
            <div className="mt-1.5">
              <RichTextEditor
                defaultValue={description}
                onChange={setDescription}
                placeholder="Tulis deskripsi item…"
                disabled={pending}
              />
            </div>
          </div>

          <div className="rounded-lg border border-border p-4">
            <ImagePicker value={image} onChange={setImage} purpose="cover" disabled={pending} />
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
            <Field label="Kategori" htmlFor="item-category">
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger id="item-category" className="w-full" disabled={pending}>
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

            <Field label="Jenis" htmlFor="item-kind">
              <Select value={kind} onValueChange={(v) => setKind(v as EventItemKind)}>
                <SelectTrigger id="item-kind" className="w-full" disabled={pending}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_ITEM_KINDS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {KIND_LABEL[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
            <Field label="Harga per hari (Rp)" htmlFor="item-price">
              <Input
                id="item-price"
                type="number"
                min={0}
                step={1}
                value={pricePerDay}
                onChange={(e) => setPricePerDay(e.target.value)}
                disabled={pending}
              />
            </Field>

            <label className="flex items-center gap-2 text-sm text-primary">
              <input
                type="checkbox"
                className="accent-primary"
                checked={supportsHourly}
                onChange={(e) => setSupportsHourly(e.target.checked)}
                disabled={pending}
              />
              Dukung sewa per jam
            </label>

            {supportsHourly && (
              <>
                <Field label="Harga per jam (Rp)" htmlFor="item-hourly-rate">
                  <Input
                    id="item-hourly-rate"
                    type="number"
                    min={0}
                    step={1}
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(e.target.value)}
                    disabled={pending}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Ditetapkan terpisah, bukan hasil bagi harga harian.
                  </p>
                </Field>
                <Field label="Minimum jam (opsional)" htmlFor="item-minimum-hours">
                  <Input
                    id="item-minimum-hours"
                    type="number"
                    min={1}
                    step={1}
                    value={minimumHours}
                    onChange={(e) => setMinimumHours(e.target.value)}
                    disabled={pending}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Kosongkan untuk memakai default kebijakan.
                  </p>
                </Field>
              </>
            )}

            <Field label="Stok total" htmlFor="item-stock">
              <Input
                id="item-stock"
                type="number"
                min={0}
                step={1}
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
                disabled={pending}
              />
            </Field>
            <Field label="Urutan" htmlFor="item-sort-order">
              <Input
                id="item-sort-order"
                type="number"
                min={0}
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                disabled={pending}
              />
            </Field>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="secondary" onClick={handleSubmit} disabled={pending}>
          {props.mode === "edit" ? (pending ? "Menyimpan…" : "Simpan perubahan") : pending ? "Membuat…" : "Buat item"}
        </Button>
        <Button
          variant="outlineSecondary"
          onClick={() => (props.mode === "edit" ? props.onCancel() : router.push("/event-support/items"))}
          disabled={pending}
        >
          Batal
        </Button>
      </div>
    </div>
  );
}
