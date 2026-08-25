"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { updatePropertyAction } from "@/app/actions/properties";
import { PROPERTY_STATUSES, LISTING_TYPES, type PropertyStatus, type ListingType } from "@/lib/properties/query";
import type {
  AdminPropertyDetail,
  AdminPropertyAmenity,
  AdminPropertyUpdateInput,
  PropertyTypeOption,
} from "@/lib/api/properties";

const STATUS_LABEL: Record<PropertyStatus, string> = {
  draft: "Draf",
  published: "Terbit",
  archived: "Arsip",
};

const LISTING_LABEL: Record<ListingType, string> = {
  sale: "Dijual",
  rent: "Disewa",
};

const NONE = "none";

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

export function PropertyEditForm({
  property,
  propertyTypes,
  amenities,
  onSaved,
  onCancel,
}: {
  property: AdminPropertyDetail;
  propertyTypes: PropertyTypeOption[];
  amenities: AdminPropertyAmenity[];
  onSaved: (fresh: AdminPropertyDetail) => void;
  onCancel: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(property.title);
  const [description, setDescription] = useState(property.description ?? "");
  const [listingType, setListingType] = useState<ListingType>(property.listingType);
  const [status, setStatus] = useState<PropertyStatus>(property.status);
  const [price, setPrice] = useState(property.price !== null ? String(property.price) : "");
  const [currency, setCurrency] = useState(property.currency);
  const [bedrooms, setBedrooms] = useState(property.bedrooms !== null ? String(property.bedrooms) : "");
  const [bathrooms, setBathrooms] = useState(property.bathrooms !== null ? String(property.bathrooms) : "");
  const [areaSqm, setAreaSqm] = useState(property.areaSqm !== null ? String(property.areaSqm) : "");
  const [address, setAddress] = useState(property.address ?? "");
  const [area, setArea] = useState(property.area ?? "");
  const [city, setCity] = useState(property.city ?? "");
  const [province, setProvince] = useState(property.province ?? "");
  const [latitude, setLatitude] = useState(property.latitude !== null ? String(property.latitude) : "");
  const [longitude, setLongitude] = useState(property.longitude !== null ? String(property.longitude) : "");
  const [isFeatured, setIsFeatured] = useState(property.isFeatured);
  const [propertyTypeId, setPropertyTypeId] = useState(property.propertyType?.id ?? NONE);
  const [amenityIds, setAmenityIds] = useState<Set<string>>(
    new Set(property.amenities.map((a) => a.id)),
  );

  function toggleAmenity(id: string) {
    setAmenityIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toNullableNumber(v: string): number | null {
    return v.trim() === "" ? null : Number(v);
  }

  function handleSave() {
    setError(null);

    if (title.trim().length < 2) {
      setError("Judul minimal 2 karakter.");
      return;
    }
    const priceNumber = Number(price);
    if (price.trim() === "" || Number.isNaN(priceNumber) || priceNumber < 0) {
      setError("Harga wajib diisi dengan angka yang valid.");
      return;
    }

    const patch: AdminPropertyUpdateInput = {
      title: title.trim(),
      description: description || null,
      listingType,
      status,
      price: priceNumber,
      currency: currency.trim() || "IDR",
      bedrooms: toNullableNumber(bedrooms),
      bathrooms: toNullableNumber(bathrooms),
      areaSqm: toNullableNumber(areaSqm),
      address: address.trim() || null,
      area: area.trim() || null,
      city: city.trim() || null,
      province: province.trim() || null,
      latitude: toNullableNumber(latitude),
      longitude: toNullableNumber(longitude),
      isFeatured,
      propertyTypeId: propertyTypeId === NONE ? null : propertyTypeId,
      amenityIds: [...amenityIds],
    };

    startTransition(async () => {
      const result = await updatePropertyAction(property.id, patch);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onSaved(result.data);
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
          <div className="rounded-lg border border-border p-4">
            <Field label="Judul" htmlFor="edit-title">
              <Input id="edit-title" value={title} onChange={(e) => setTitle(e.target.value)} disabled={pending} />
            </Field>
          </div>

          <div className="rounded-lg border border-border p-4">
            <Label>Deskripsi</Label>
            <div className="mt-1.5">
              <RichTextEditor
                defaultValue={description}
                onChange={setDescription}
                placeholder="Tulis deskripsi properti…"
                disabled={pending}
              />
            </div>
          </div>

          <div className="rounded-lg border border-border p-4">
            <Label>Fasilitas</Label>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {amenities.map((a) => (
                <label
                  key={a.id}
                  className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-primary"
                >
                  <input
                    type="checkbox"
                    className="accent-primary"
                    checked={amenityIds.has(a.id)}
                    onChange={() => toggleAmenity(a.id)}
                    disabled={pending}
                  />
                  <span className="truncate">{a.name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
            <Field label="Status" htmlFor="edit-status">
              <Select value={status} onValueChange={(v) => setStatus(v as PropertyStatus)}>
                <SelectTrigger id="edit-status" className="w-full" disabled={pending}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROPERTY_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Tipe listing" htmlFor="edit-listing-type">
              <Select value={listingType} onValueChange={(v) => setListingType(v as ListingType)}>
                <SelectTrigger id="edit-listing-type" className="w-full" disabled={pending}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LISTING_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {LISTING_LABEL[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Kategori" htmlFor="edit-property-type">
              <Select value={propertyTypeId} onValueChange={setPropertyTypeId}>
                <SelectTrigger id="edit-property-type" className="w-full" disabled={pending}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Tanpa kategori</SelectItem>
                  {propertyTypes.map((pt) => (
                    <SelectItem key={pt.id} value={pt.id}>
                      {pt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <label className="mt-1 flex items-center gap-2 text-sm text-primary">
              <input
                type="checkbox"
                className="accent-primary"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                disabled={pending}
              />
              Properti unggulan
            </label>
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
            <div className="flex gap-3">
              <Field label="Harga" htmlFor="edit-price" className="flex-1">
                <Input
                  id="edit-price"
                  type="number"
                  min={0}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  disabled={pending}
                />
              </Field>
              <Field label="Mata uang" htmlFor="edit-currency" className="w-20">
                <Input
                  id="edit-currency"
                  value={currency}
                  maxLength={3}
                  onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                  disabled={pending}
                />
              </Field>
            </div>

            <div className="flex gap-3">
              <Field label="Kamar tidur" htmlFor="edit-bedrooms" className="flex-1">
                <Input
                  id="edit-bedrooms"
                  type="number"
                  min={0}
                  value={bedrooms}
                  onChange={(e) => setBedrooms(e.target.value)}
                  disabled={pending}
                />
              </Field>
              <Field label="Kamar mandi" htmlFor="edit-bathrooms" className="flex-1">
                <Input
                  id="edit-bathrooms"
                  type="number"
                  min={0}
                  value={bathrooms}
                  onChange={(e) => setBathrooms(e.target.value)}
                  disabled={pending}
                />
              </Field>
            </div>

            <Field label="Luas (m²)" htmlFor="edit-area-sqm">
              <Input
                id="edit-area-sqm"
                type="number"
                min={0}
                value={areaSqm}
                onChange={(e) => setAreaSqm(e.target.value)}
                disabled={pending}
              />
            </Field>
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
            <Field label="Alamat" htmlFor="edit-address">
              <Input id="edit-address" value={address} onChange={(e) => setAddress(e.target.value)} disabled={pending} />
            </Field>
            <Field label="Area / kelurahan" htmlFor="edit-area">
              <Input id="edit-area" value={area} onChange={(e) => setArea(e.target.value)} disabled={pending} />
            </Field>
            <div className="flex gap-3">
              <Field label="Kota" htmlFor="edit-city" className="flex-1">
                <Input id="edit-city" value={city} onChange={(e) => setCity(e.target.value)} disabled={pending} />
              </Field>
              <Field label="Provinsi" htmlFor="edit-province" className="flex-1">
                <Input id="edit-province" value={province} onChange={(e) => setProvince(e.target.value)} disabled={pending} />
              </Field>
            </div>
            <div className="flex gap-3">
              <Field label="Latitude" htmlFor="edit-lat" className="flex-1">
                <Input
                  id="edit-lat"
                  type="number"
                  step="any"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  disabled={pending}
                />
              </Field>
              <Field label="Longitude" htmlFor="edit-lng" className="flex-1">
                <Input
                  id="edit-lng"
                  type="number"
                  step="any"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  disabled={pending}
                />
              </Field>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="secondary" onClick={handleSave} disabled={pending}>
          {pending ? "Menyimpan…" : "Simpan perubahan"}
        </Button>
        <Button variant="outlineSecondary" onClick={onCancel} disabled={pending}>
          Batal
        </Button>
      </div>
    </div>
  );
}
