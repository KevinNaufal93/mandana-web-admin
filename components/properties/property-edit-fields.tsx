"use client";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { STATUS_LABEL, LISTING_LABEL } from "@/components/properties/property-status-badge";
import { PROPERTY_STATUSES, LISTING_TYPES } from "@/lib/properties/query";
import type { DraftFields } from "@/lib/properties/use-property-draft";
import type { AdminPropertyAmenity, PropertyTypeOption } from "@/lib/api/properties";

const NONE = "none";

/** Every field group below takes the same three things: the live draft
 *  values, a setter, and whether a save is in flight (to disable inputs).
 *  Kept this way rather than passing the whole usePropertyDraft() return
 *  value, so each component's actual dependencies stay visible at the call
 *  site instead of being hidden inside one big bag of props. */
interface FieldsProps {
  fields: DraftFields;
  updateField: <K extends keyof DraftFields>(key: K, value: DraftFields[K]) => void;
  pending: boolean;
}

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

/** Header-level: replaces the plain <h1> in place when editing, so the
 *  title visibly becomes an input rather than the page swapping to a
 *  different layout. `key` on the caller side (property.updatedAt) is what
 *  makes this remount with fresh content each time edit mode is entered —
 *  this component itself holds no state of its own. */
export function TitleField({ fields, updateField, pending }: FieldsProps) {
  return (
    <Input
      aria-label="Judul properti"
      value={fields.title}
      onChange={(e) => updateField("title", e.target.value)}
      disabled={pending}
      className="h-auto max-w-xl py-1 text-2xl font-semibold"
    />
  );
}

/** Header-level: replaces the "Unggulan" star badge in place — same
 *  becomes-its-editable-counterpart move as TitleField. */
export function FeaturedToggle({ fields, updateField, pending }: FieldsProps) {
  return (
    <label className="flex items-center gap-1.5 text-sm text-primary">
      <input
        type="checkbox"
        className="accent-primary"
        checked={fields.isFeatured}
        onChange={(e) => updateField("isFeatured", e.target.checked)}
        disabled={pending}
      />
      Unggulan
    </label>
  );
}

/** Header-level: replaces the status/listing-type badge pair in place. */
export function StatusAndListingControls({ fields, updateField, pending }: FieldsProps) {
  return (
    <div className="flex items-center gap-2">
      <Select value={fields.status} onValueChange={(v) => updateField("status", v as DraftFields["status"])}>
        <SelectTrigger aria-label="Status" className="h-9 w-28" disabled={pending}>
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
      <Select value={fields.listingType} onValueChange={(v) => updateField("listingType", v as DraftFields["listingType"])}>
        <SelectTrigger aria-label="Tipe listing" className="h-9 w-28" disabled={pending}>
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
    </div>
  );
}

/** Body of the "Deskripsi" DetailCard in edit mode. */
export function DescriptionField({ fields, updateField, pending }: FieldsProps) {
  return (
    <RichTextEditor
      defaultValue={fields.description}
      onChange={(v) => updateField("description", v)}
      placeholder="Tulis deskripsi properti…"
      disabled={pending}
    />
  );
}

/** Body of the "Fasilitas" DetailCard in edit mode. */
export function AmenitiesField({
  amenities,
  fields,
  toggleAmenity,
  pending,
}: {
  amenities: AdminPropertyAmenity[];
  fields: DraftFields;
  toggleAmenity: (id: string) => void;
  pending: boolean;
}) {
  if (amenities.length === 0) {
    return <p className="text-sm text-muted-foreground">Belum ada pilihan fasilitas.</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {amenities.map((a) => {
        const checked = fields.amenityIds.has(a.id);
        return (
          <label
            key={a.id}
            className={cn(
              // Checked vs. unchecked gets a distinct surface (filled tint
              // vs. plain outline), not just the checkbox glyph — so which
              // amenities are actually ON reads at a glance instead of
              // requiring a scan of 12 identical boxes for a ticked square.
              "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
              checked
                ? "border-primary/40 bg-primary/5 font-medium text-primary"
                : "border-border/60 text-primary hover:bg-muted/40",
            )}
          >
            <input
              type="checkbox"
              className="accent-primary"
              checked={checked}
              onChange={() => toggleAmenity(a.id)}
              disabled={pending}
            />
            <span className="truncate">{a.name}</span>
          </label>
        );
      })}
    </div>
  );
}

/** Body of the "Spesifikasi" DetailCard in edit mode — same fields the
 *  read-only DetailRow list shows (Kategori/Harga/Kamar tidur/Kamar
 *  mandi/Luas), same card, same order. */
export function SpecFields({
  fields,
  updateField,
  propertyTypes,
  pending,
}: FieldsProps & { propertyTypes: PropertyTypeOption[] }) {
  return (
    <div className="flex flex-col gap-3">
      <Field label="Kategori" htmlFor="edit-property-type">
        <Select value={fields.propertyTypeId} onValueChange={(v) => updateField("propertyTypeId", v)}>
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

      <div className="flex gap-3">
        <Field label="Harga" htmlFor="edit-price" className="flex-1">
          <Input
            id="edit-price"
            type="number"
            min={0}
            value={fields.price}
            onChange={(e) => updateField("price", e.target.value)}
            disabled={pending}
          />
        </Field>
        <Field label="Mata uang" htmlFor="edit-currency" className="w-20">
          <Input
            id="edit-currency"
            value={fields.currency}
            maxLength={3}
            onChange={(e) => updateField("currency", e.target.value.toUpperCase())}
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
            value={fields.bedrooms}
            onChange={(e) => updateField("bedrooms", e.target.value)}
            disabled={pending}
          />
        </Field>
        <Field label="Kamar mandi" htmlFor="edit-bathrooms" className="flex-1">
          <Input
            id="edit-bathrooms"
            type="number"
            min={0}
            value={fields.bathrooms}
            onChange={(e) => updateField("bathrooms", e.target.value)}
            disabled={pending}
          />
        </Field>
      </div>

      <Field label="Luas (m²)" htmlFor="edit-area-sqm">
        <Input
          id="edit-area-sqm"
          type="number"
          min={0}
          value={fields.areaSqm}
          onChange={(e) => updateField("areaSqm", e.target.value)}
          disabled={pending}
        />
      </Field>
    </div>
  );
}

/** Body of the "Lokasi" DetailCard in edit mode. */
export function LocationFields({ fields, updateField, pending }: FieldsProps) {
  return (
    <div className="flex flex-col gap-3">
      <Field label="Alamat" htmlFor="edit-address">
        <Input id="edit-address" value={fields.address} onChange={(e) => updateField("address", e.target.value)} disabled={pending} />
      </Field>
      <Field label="Area / kelurahan" htmlFor="edit-area">
        <Input id="edit-area" value={fields.area} onChange={(e) => updateField("area", e.target.value)} disabled={pending} />
      </Field>
      <div className="flex gap-3">
        <Field label="Kota" htmlFor="edit-city" className="flex-1">
          <Input id="edit-city" value={fields.city} onChange={(e) => updateField("city", e.target.value)} disabled={pending} />
        </Field>
        <Field label="Provinsi" htmlFor="edit-province" className="flex-1">
          <Input id="edit-province" value={fields.province} onChange={(e) => updateField("province", e.target.value)} disabled={pending} />
        </Field>
      </div>
      <div className="flex gap-3">
        <Field label="Latitude" htmlFor="edit-lat" className="flex-1">
          <Input
            id="edit-lat"
            type="number"
            step="any"
            value={fields.latitude}
            onChange={(e) => updateField("latitude", e.target.value)}
            disabled={pending}
          />
        </Field>
        <Field label="Longitude" htmlFor="edit-lng" className="flex-1">
          <Input
            id="edit-lng"
            type="number"
            step="any"
            value={fields.longitude}
            onChange={(e) => updateField("longitude", e.target.value)}
            disabled={pending}
          />
        </Field>
      </div>
    </div>
  );
}
