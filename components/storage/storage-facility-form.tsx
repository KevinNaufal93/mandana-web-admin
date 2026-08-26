"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { ImagePicker, type ImagePickerValue } from "@/components/media/image-picker";
import { createStorageFacilityAction, updateStorageFacilityAction } from "@/app/actions/storage";
import type { AdminStorageFacility, StorageFacilityInput } from "@/lib/api/storage";

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

type StorageFacilityFormProps =
  | { mode: "create" }
  | { mode: "edit"; facility: AdminStorageFacility; onSaved: (fresh: AdminStorageFacility) => void; onCancel: () => void };

/** One component for create and edit — the field set is identical either
 *  way, same pattern as EventCategoryForm. */
export function StorageFacilityForm(props: StorageFacilityFormProps) {
  const router = useRouter();
  const facility = props.mode === "edit" ? props.facility : null;

  const [name, setName] = useState(facility?.name ?? "");
  const [slug, setSlug] = useState(facility?.slug ?? "");
  const [description, setDescription] = useState(facility?.description ?? "");
  const [address, setAddress] = useState(facility?.address ?? "");
  const [area, setArea] = useState(facility?.area ?? "");
  const [city, setCity] = useState(facility?.city ?? "");
  const [province, setProvince] = useState(facility?.province ?? "");
  const [latitude, setLatitude] = useState(facility?.latitude != null ? String(facility.latitude) : "");
  const [longitude, setLongitude] = useState(facility?.longitude != null ? String(facility.longitude) : "");
  const [isActive, setIsActive] = useState(facility?.isActive ?? true);
  const [sortOrder, setSortOrder] = useState(facility ? String(facility.sortOrder) : "0");
  const [image, setImage] = useState<ImagePickerValue>({
    mediaAssetId: null,
    preview: facility?.image ? { url: facility.image.url, alt: facility.image.alt } : null,
  });

  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit() {
    setError(null);

    if (name.trim().length < 2) {
      setError("Nama minimal 2 karakter.");
      return;
    }
    const sortOrderNumber = Number(sortOrder);
    if (!Number.isInteger(sortOrderNumber) || sortOrderNumber < 0) {
      setError("Urutan harus berupa bilangan bulat 0 atau lebih.");
      return;
    }
    let lat: number | undefined;
    if (latitude.trim()) {
      lat = Number(latitude);
      if (!Number.isFinite(lat)) {
        setError("Latitude harus berupa angka.");
        return;
      }
    }
    let lng: number | undefined;
    if (longitude.trim()) {
      lng = Number(longitude);
      if (!Number.isFinite(lng)) {
        setError("Longitude harus berupa angka.");
        return;
      }
    }

    const input: StorageFacilityInput = {
      name: name.trim(),
      slug: slug.trim() || undefined,
      description: description || undefined,
      address: address.trim() || undefined,
      area: area.trim() || undefined,
      city: city.trim() || undefined,
      province: province.trim() || undefined,
      latitude: lat,
      longitude: lng,
      mediaAssetId: image.mediaAssetId ?? undefined,
      isActive,
      sortOrder: sortOrderNumber,
    };

    startTransition(async () => {
      if (props.mode === "edit") {
        const result = await updateStorageFacilityAction(props.facility.id, input);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        props.onSaved(result.data);
        return;
      }
      const result = await createStorageFacilityAction(input);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/storage/facilities/${result.data.id}`);
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
            <Field label="Nama" htmlFor="facility-name">
              <Input id="facility-name" value={name} onChange={(e) => setName(e.target.value)} disabled={pending} />
            </Field>
            <Field label="Slug (opsional)" htmlFor="facility-slug">
              <Input
                id="facility-slug"
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
                placeholder="Tulis deskripsi fasilitas…"
                disabled={pending}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
            <Field label="Alamat" htmlFor="facility-address">
              <Input id="facility-address" value={address} onChange={(e) => setAddress(e.target.value)} disabled={pending} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Area" htmlFor="facility-area">
                <Input id="facility-area" value={area} onChange={(e) => setArea(e.target.value)} disabled={pending} />
              </Field>
              <Field label="Kota" htmlFor="facility-city">
                <Input id="facility-city" value={city} onChange={(e) => setCity(e.target.value)} disabled={pending} />
              </Field>
              <Field label="Provinsi" htmlFor="facility-province">
                <Input id="facility-province" value={province} onChange={(e) => setProvince(e.target.value)} disabled={pending} />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Latitude (opsional)" htmlFor="facility-lat">
                <Input
                  id="facility-lat"
                  type="number"
                  step="any"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  disabled={pending}
                />
              </Field>
              <Field label="Longitude (opsional)" htmlFor="facility-lng">
                <Input
                  id="facility-lng"
                  type="number"
                  step="any"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  disabled={pending}
                />
              </Field>
            </div>
          </div>

          <div className="rounded-lg border border-border p-4">
            <ImagePicker value={image} onChange={setImage} purpose="cover" disabled={pending} />
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
          <Field label="Urutan" htmlFor="facility-sort-order">
            <Input
              id="facility-sort-order"
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

      <div className="flex items-center gap-2">
        <Button variant="secondary" onClick={handleSubmit} disabled={pending}>
          {props.mode === "edit" ? (pending ? "Menyimpan…" : "Simpan perubahan") : pending ? "Membuat…" : "Buat fasilitas"}
        </Button>
        <Button
          variant="outlineSecondary"
          onClick={() => (props.mode === "edit" ? props.onCancel() : router.push("/storage/facilities"))}
          disabled={pending}
        >
          Batal
        </Button>
      </div>
    </div>
  );
}
