"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { ImagePicker, type ImagePickerValue } from "@/components/media/image-picker";
import { createStorageUnitTypeAction, updateStorageUnitTypeAction } from "@/app/actions/storage";
import type { AdminStorageUnitType, StorageUnitTypeInput } from "@/lib/api/storage";

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

type StorageUnitTypeFormProps =
  | { mode: "create" }
  | { mode: "edit"; unitType: AdminStorageUnitType; onSaved: (fresh: AdminStorageUnitType) => void; onCancel: () => void };

/**
 * One component for create and edit. Dimensions are the one field with an
 * asymmetric read/write shape: the read DTO nests them under
 * `dimensions: {lengthCm, widthCm, heightCm} | null`, but Create/Update DTOs
 * take flat `lengthCm?`/`widthCm?`/`heightCm?` — unpacked here on load,
 * flattened again on submit (see lib/api/storage.ts's header comment).
 */
export function StorageUnitTypeForm(props: StorageUnitTypeFormProps) {
  const router = useRouter();
  const unitType = props.mode === "edit" ? props.unitType : null;

  const [name, setName] = useState(unitType?.name ?? "");
  const [slug, setSlug] = useState(unitType?.slug ?? "");
  const [description, setDescription] = useState(unitType?.description ?? "");
  const [volumeM3, setVolumeM3] = useState(unitType?.volumeM3 != null ? String(unitType.volumeM3) : "");
  const [lengthCm, setLengthCm] = useState(unitType?.dimensions ? String(unitType.dimensions.lengthCm) : "");
  const [widthCm, setWidthCm] = useState(unitType?.dimensions ? String(unitType.dimensions.widthCm) : "");
  const [heightCm, setHeightCm] = useState(unitType?.dimensions ? String(unitType.dimensions.heightCm) : "");
  const [monthlyRate, setMonthlyRate] = useState(unitType ? String(unitType.monthlyRate) : "");
  const [minDurationMonths, setMinDurationMonths] = useState(unitType ? String(unitType.minDurationMonths) : "1");
  const [isActive, setIsActive] = useState(unitType?.isActive ?? true);
  const [sortOrder, setSortOrder] = useState(unitType ? String(unitType.sortOrder) : "0");
  const [image, setImage] = useState<ImagePickerValue>({
    mediaAssetId: null,
    preview: unitType?.image ? { url: unitType.image.url, alt: unitType.image.alt } : null,
  });

  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit() {
    setError(null);

    if (name.trim().length < 2) {
      setError("Nama minimal 2 karakter.");
      return;
    }
    const rate = Number(monthlyRate);
    if (monthlyRate.trim() === "" || !Number.isInteger(rate) || rate < 0) {
      setError("Tarif bulanan harus berupa bilangan bulat (Rupiah), 0 atau lebih.");
      return;
    }
    const minDuration = Number(minDurationMonths);
    if (!Number.isInteger(minDuration) || minDuration < 1) {
      setError("Durasi minimum harus berupa bilangan bulat, minimal 1 bulan.");
      return;
    }
    const sortOrderNumber = Number(sortOrder);
    if (!Number.isInteger(sortOrderNumber) || sortOrderNumber < 0) {
      setError("Urutan harus berupa bilangan bulat 0 atau lebih.");
      return;
    }
    let volume: number | undefined;
    if (volumeM3.trim()) {
      volume = Number(volumeM3);
      if (!Number.isFinite(volume) || volume < 0) {
        setError("Volume harus berupa angka 0 atau lebih.");
        return;
      }
    }
    // Dimensions are optional as a set, but partial (e.g. length only) has
    // no meaning server-side — require all three or none.
    const dims = [lengthCm, widthCm, heightCm];
    const anyDim = dims.some((d) => d.trim() !== "");
    const allDim = dims.every((d) => d.trim() !== "");
    if (anyDim && !allDim) {
      setError("Isi panjang, lebar, dan tinggi sekaligus, atau kosongkan ketiganya.");
      return;
    }
    let length: number | undefined, width: number | undefined, height: number | undefined;
    if (allDim) {
      length = Number(lengthCm);
      width = Number(widthCm);
      height = Number(heightCm);
      if (![length, width, height].every((d) => Number.isFinite(d) && d > 0)) {
        setError("Dimensi harus berupa angka lebih dari 0.");
        return;
      }
    }

    const input: StorageUnitTypeInput = {
      name: name.trim(),
      slug: slug.trim() || undefined,
      description: description || undefined,
      volumeM3: volume,
      lengthCm: length,
      widthCm: width,
      heightCm: height,
      monthlyRate: rate,
      minDurationMonths: minDuration,
      mediaAssetId: image.mediaAssetId ?? undefined,
      isActive,
      sortOrder: sortOrderNumber,
    };

    startTransition(async () => {
      if (props.mode === "edit") {
        const result = await updateStorageUnitTypeAction(props.unitType.id, input);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        props.onSaved(result.data);
        return;
      }
      const result = await createStorageUnitTypeAction(input);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/storage/unit-types/${result.data.id}`);
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
            <Field label="Nama" htmlFor="unit-type-name">
              <Input id="unit-type-name" value={name} onChange={(e) => setName(e.target.value)} disabled={pending} />
            </Field>
            <Field label="Slug (opsional)" htmlFor="unit-type-slug">
              <Input
                id="unit-type-slug"
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
                placeholder="Tulis deskripsi tipe unit…"
                disabled={pending}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
            <Field label="Volume (m³, opsional)" htmlFor="unit-type-volume">
              <Input
                id="unit-type-volume"
                type="number"
                min={0}
                step="any"
                value={volumeM3}
                onChange={(e) => setVolumeM3(e.target.value)}
                disabled={pending}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Panjang (cm)" htmlFor="unit-type-length">
                <Input
                  id="unit-type-length"
                  type="number"
                  min={0}
                  step="any"
                  value={lengthCm}
                  onChange={(e) => setLengthCm(e.target.value)}
                  disabled={pending}
                />
              </Field>
              <Field label="Lebar (cm)" htmlFor="unit-type-width">
                <Input
                  id="unit-type-width"
                  type="number"
                  min={0}
                  step="any"
                  value={widthCm}
                  onChange={(e) => setWidthCm(e.target.value)}
                  disabled={pending}
                />
              </Field>
              <Field label="Tinggi (cm)" htmlFor="unit-type-height">
                <Input
                  id="unit-type-height"
                  type="number"
                  min={0}
                  step="any"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  disabled={pending}
                />
              </Field>
            </div>
          </div>

          <div className="rounded-lg border border-border p-4">
            <ImagePicker value={image} onChange={setImage} purpose="cover" disabled={pending} />
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
            <Field label="Tarif bulanan (Rp)" htmlFor="unit-type-rate">
              <Input
                id="unit-type-rate"
                type="number"
                min={0}
                step={1}
                value={monthlyRate}
                onChange={(e) => setMonthlyRate(e.target.value)}
                disabled={pending}
              />
            </Field>
            <Field label="Durasi minimum (bulan)" htmlFor="unit-type-min-duration">
              <Input
                id="unit-type-min-duration"
                type="number"
                min={1}
                step={1}
                value={minDurationMonths}
                onChange={(e) => setMinDurationMonths(e.target.value)}
                disabled={pending}
              />
            </Field>
            <Field label="Urutan" htmlFor="unit-type-sort-order">
              <Input
                id="unit-type-sort-order"
                type="number"
                min={0}
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                disabled={pending}
              />
            </Field>
            <label className="mt-1 flex items-center gap-2 text-sm text-primary">
              <input
                type="checkbox"
                className="accent-primary"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                disabled={pending}
              />
              Aktif
            </label>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="secondary" onClick={handleSubmit} disabled={pending}>
          {props.mode === "edit" ? (pending ? "Menyimpan…" : "Simpan perubahan") : pending ? "Membuat…" : "Buat tipe unit"}
        </Button>
        <Button
          variant="outlineSecondary"
          onClick={() => (props.mode === "edit" ? props.onCancel() : router.push("/storage/unit-types"))}
          disabled={pending}
        >
          Batal
        </Button>
      </div>
    </div>
  );
}
