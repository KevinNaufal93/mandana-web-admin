"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { ImagePicker, type ImagePickerValue } from "@/components/media/image-picker";
import { createMovingTruckClassAction, updateMovingTruckClassAction } from "@/app/actions/moving";
import type { AdminMovingTruckClass } from "@/lib/api/moving";
import type { MovingTruckClassInput } from "@/lib/api/moving";

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

type MovingTruckClassFormProps =
  | { mode: "create" }
  | { mode: "edit"; truckClass: AdminMovingTruckClass; onSaved: (fresh: AdminMovingTruckClass) => void; onCancel: () => void };

/**
 * One component for create and edit — same pattern as StorageUnitTypeForm.
 * Dimensions are the one field with an asymmetric read/write shape: the
 * read DTO nests them under `dimensions: {lengthCm, widthCm, heightCm} |
 * null`, but Create/Update DTOs take flat `lengthCm?`/`widthCm?`/`heightCm?`
 * — unpacked here on load, flattened again on submit.
 */
export function MovingTruckClassForm(props: MovingTruckClassFormProps) {
  const router = useRouter();
  const truckClass = props.mode === "edit" ? props.truckClass : null;

  const [name, setName] = useState(truckClass?.name ?? "");
  const [slug, setSlug] = useState(truckClass?.slug ?? "");
  const [description, setDescription] = useState(truckClass?.description ?? "");
  const [capacityKg, setCapacityKg] = useState(truckClass?.capacityKg != null ? String(truckClass.capacityKg) : "");
  const [volumeM3, setVolumeM3] = useState(truckClass?.volumeM3 != null ? String(truckClass.volumeM3) : "");
  const [lengthCm, setLengthCm] = useState(truckClass?.dimensions ? String(truckClass.dimensions.lengthCm) : "");
  const [widthCm, setWidthCm] = useState(truckClass?.dimensions ? String(truckClass.dimensions.widthCm) : "");
  const [heightCm, setHeightCm] = useState(truckClass?.dimensions ? String(truckClass.dimensions.heightCm) : "");
  const [helperCount, setHelperCount] = useState(truckClass?.helperCount != null ? String(truckClass.helperCount) : "");
  const [baseFare, setBaseFare] = useState(truckClass ? String(truckClass.baseFare) : "");
  const [perKmFare, setPerKmFare] = useState(truckClass ? String(truckClass.perKmFare) : "");
  const [includedKm, setIncludedKm] = useState(truckClass?.includedKm != null ? String(truckClass.includedKm) : "");
  const [minFare, setMinFare] = useState(truckClass?.minFare != null ? String(truckClass.minFare) : "");
  const [isActive, setIsActive] = useState(truckClass?.isActive ?? true);
  const [sortOrder, setSortOrder] = useState(truckClass ? String(truckClass.sortOrder) : "0");
  const [image, setImage] = useState<ImagePickerValue>({
    mediaAssetId: truckClass?.mediaAssetId ?? null,
    preview: truckClass?.image ? { url: truckClass.image.url, alt: truckClass.image.alt } : null,
  });

  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit() {
    setError(null);

    if (name.trim().length < 2) {
      setError("Nama minimal 2 karakter.");
      return;
    }
    const base = Number(baseFare);
    if (baseFare.trim() === "" || !Number.isInteger(base) || base < 0) {
      setError("Tarif dasar harus berupa bilangan bulat (Rupiah), 0 atau lebih.");
      return;
    }
    const perKm = Number(perKmFare);
    if (perKmFare.trim() === "" || !Number.isInteger(perKm) || perKm < 0) {
      setError("Tarif per km harus berupa bilangan bulat (Rupiah), 0 atau lebih.");
      return;
    }
    const sortOrderNumber = Number(sortOrder);
    if (!Number.isInteger(sortOrderNumber) || sortOrderNumber < 0) {
      setError("Urutan harus berupa bilangan bulat 0 atau lebih.");
      return;
    }
    let capacity: number | undefined;
    if (capacityKg.trim()) {
      capacity = Number(capacityKg);
      if (!Number.isFinite(capacity) || capacity < 0) {
        setError("Kapasitas harus berupa angka 0 atau lebih.");
        return;
      }
    }
    let volume: number | undefined;
    if (volumeM3.trim()) {
      volume = Number(volumeM3);
      if (!Number.isFinite(volume) || volume < 0) {
        setError("Volume harus berupa angka 0 atau lebih.");
        return;
      }
    }
    let helpers: number | undefined;
    if (helperCount.trim()) {
      helpers = Number(helperCount);
      if (!Number.isInteger(helpers) || helpers < 0) {
        setError("Jumlah helper harus berupa bilangan bulat 0 atau lebih.");
        return;
      }
    }
    let included: number | undefined;
    if (includedKm.trim()) {
      included = Number(includedKm);
      if (!Number.isInteger(included) || included < 0) {
        setError("Km termasuk harus berupa bilangan bulat 0 atau lebih.");
        return;
      }
    }
    let minFareNumber: number | undefined;
    if (minFare.trim()) {
      minFareNumber = Number(minFare);
      if (!Number.isInteger(minFareNumber) || minFareNumber < 0) {
        setError("Tarif minimum harus berupa bilangan bulat (Rupiah), 0 atau lebih.");
        return;
      }
    }
    // Dimensions are optional as a set, but partial (e.g. length only) has
    // no meaning server-side — require all three or none.
    const dims = [lengthCm, widthCm, heightCm];
    const anyDim = dims.some((d) => d.trim() !== "");
    const allDim = dims.every((d) => d.trim() !== "");
    if (anyDim && !allDim) {
      setError("Isi panjang, lebar, dan tinggi bak sekaligus, atau kosongkan ketiganya.");
      return;
    }
    let length: number | undefined, width: number | undefined, height: number | undefined;
    if (allDim) {
      length = Number(lengthCm);
      width = Number(widthCm);
      height = Number(heightCm);
      if (![length, width, height].every((d) => Number.isFinite(d) && d > 0)) {
        setError("Dimensi bak harus berupa angka lebih dari 0.");
        return;
      }
    }

    const input: MovingTruckClassInput = {
      name: name.trim(),
      slug: slug.trim() || undefined,
      description: description || undefined,
      capacityKg: capacity,
      volumeM3: volume,
      lengthCm: length,
      widthCm: width,
      heightCm: height,
      helperCount: helpers,
      baseFare: base,
      perKmFare: perKm,
      includedKm: included,
      minFare: minFareNumber,
      mediaAssetId: image.mediaAssetId ?? undefined,
      isActive,
      sortOrder: sortOrderNumber,
    };

    startTransition(async () => {
      if (props.mode === "edit") {
        const result = await updateMovingTruckClassAction(props.truckClass.id, input);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        props.onSaved(result.data);
        return;
      }
      const result = await createMovingTruckClassAction(input);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/moving/truck-classes/${result.data.id}`);
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
            <Field label="Nama" htmlFor="truck-class-name">
              <Input id="truck-class-name" value={name} onChange={(e) => setName(e.target.value)} disabled={pending} />
            </Field>
            <Field label="Slug (opsional)" htmlFor="truck-class-slug">
              <Input
                id="truck-class-slug"
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
                placeholder="Tulis deskripsi tipe truk…"
                disabled={pending}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Kapasitas (kg, opsional)" htmlFor="truck-class-capacity">
                <Input
                  id="truck-class-capacity"
                  type="number"
                  min={0}
                  step="any"
                  value={capacityKg}
                  onChange={(e) => setCapacityKg(e.target.value)}
                  disabled={pending}
                />
              </Field>
              <Field label="Volume (m³, opsional)" htmlFor="truck-class-volume">
                <Input
                  id="truck-class-volume"
                  type="number"
                  min={0}
                  step="any"
                  value={volumeM3}
                  onChange={(e) => setVolumeM3(e.target.value)}
                  disabled={pending}
                />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Panjang bak (cm)" htmlFor="truck-class-length">
                <Input
                  id="truck-class-length"
                  type="number"
                  min={0}
                  step="any"
                  value={lengthCm}
                  onChange={(e) => setLengthCm(e.target.value)}
                  disabled={pending}
                />
              </Field>
              <Field label="Lebar bak (cm)" htmlFor="truck-class-width">
                <Input
                  id="truck-class-width"
                  type="number"
                  min={0}
                  step="any"
                  value={widthCm}
                  onChange={(e) => setWidthCm(e.target.value)}
                  disabled={pending}
                />
              </Field>
              <Field label="Tinggi bak (cm)" htmlFor="truck-class-height">
                <Input
                  id="truck-class-height"
                  type="number"
                  min={0}
                  step="any"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  disabled={pending}
                />
              </Field>
            </div>
            <Field label="Jumlah helper (opsional)" htmlFor="truck-class-helpers">
              <Input
                id="truck-class-helpers"
                type="number"
                min={0}
                step={1}
                value={helperCount}
                onChange={(e) => setHelperCount(e.target.value)}
                disabled={pending}
                className="max-w-40"
              />
            </Field>
          </div>

          <div className="rounded-lg border border-border p-4">
            <ImagePicker value={image} onChange={setImage} purpose="cover" disabled={pending} />
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
            <Field label="Tarif dasar (Rp)" htmlFor="truck-class-base-fare">
              <Input
                id="truck-class-base-fare"
                type="number"
                min={0}
                step={1}
                value={baseFare}
                onChange={(e) => setBaseFare(e.target.value)}
                disabled={pending}
              />
            </Field>
            <Field label="Tarif per km (Rp)" htmlFor="truck-class-per-km-fare">
              <Input
                id="truck-class-per-km-fare"
                type="number"
                min={0}
                step={1}
                value={perKmFare}
                onChange={(e) => setPerKmFare(e.target.value)}
                disabled={pending}
              />
            </Field>
            <Field label="Km termasuk (opsional)" htmlFor="truck-class-included-km">
              <Input
                id="truck-class-included-km"
                type="number"
                min={0}
                step={1}
                value={includedKm}
                onChange={(e) => setIncludedKm(e.target.value)}
                placeholder="Pakai default pengaturan bila kosong"
                disabled={pending}
              />
            </Field>
            <Field label="Tarif minimum (Rp, opsional)" htmlFor="truck-class-min-fare">
              <Input
                id="truck-class-min-fare"
                type="number"
                min={0}
                step={1}
                value={minFare}
                onChange={(e) => setMinFare(e.target.value)}
                disabled={pending}
              />
            </Field>
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
            <Field label="Urutan" htmlFor="truck-class-sort-order">
              <Input
                id="truck-class-sort-order"
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
          {props.mode === "edit" ? (pending ? "Menyimpan…" : "Simpan perubahan") : pending ? "Membuat…" : "Buat tipe truk"}
        </Button>
        <Button
          variant="outlineSecondary"
          onClick={() => (props.mode === "edit" ? props.onCancel() : router.push("/moving/truck-classes"))}
          disabled={pending}
        >
          Batal
        </Button>
      </div>
    </div>
  );
}
