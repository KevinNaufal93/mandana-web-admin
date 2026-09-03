"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { MapPin, MessageCircle, Phone, Pencil, ExternalLink, Star, User, Lock, Check, X } from "lucide-react";
import { PropertyStatusBadge, ListingTypeBadge } from "@/components/properties/property-status-badge";
import { PropertyImagesGallery, PropertyImagesEditor } from "@/components/properties/property-images-field";
import { PropertyAmenities } from "@/components/properties/property-amenities";
import { RichTextView } from "@/components/ui/rich-text-view";
import {
  TitleField,
  FeaturedToggle,
  StatusAndListingControls,
  DescriptionField,
  AmenitiesField,
  SpecFields,
  LocationFields,
  NewPropertyFields,
  CONSTRUCTION_STATUS_LABEL,
} from "@/components/properties/property-edit-fields";
import { DetailCard, DetailRow } from "@/components/ui/detail-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { updatePropertyAction } from "@/app/actions/properties";
import { usePropertyDraft } from "@/lib/properties/use-property-draft";
import { composeLocation, formatIDRFull, formatDateID, toWaNumber } from "@/lib/format";
import type { AdminPropertyDetail, AdminPropertyAmenity, PropertyTypeOption } from "@/lib/api/properties";
import type { PropertyStatus } from "@/lib/properties/query";

export function PropertyDetailView({
  property: initialProperty,
  propertyTypes,
  amenities,
}: {
  property: AdminPropertyDetail;
  propertyTypes: PropertyTypeOption[];
  amenities: AdminPropertyAmenity[];
}) {
  const [property, setProperty] = useState(initialProperty);
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [quickPending, startQuickTransition] = useTransition();
  const [quickError, setQuickError] = useState<string | null>(null);
  // Declared before the functions that close over its setter below —
  // function declarations hoist, but the linter (correctly) wants the
  // state itself to exist first in source order.
  const [syncedUpdatedAt, setSyncedUpdatedAt] = useState(initialProperty.updatedAt);

  function handleSaved(fresh: AdminPropertyDetail) {
    setProperty(fresh);
    setSyncedUpdatedAt(fresh.updatedAt);
    setMode("view");
  }

  const draft = usePropertyDraft(handleSaved);

  // Published listings are live on the public site — editing fields or
  // images out from under a published property is the guard this whole
  // block exists to prevent. The only way out is the status buttons below,
  // which only ever touch `status`, never the content fields.
  const locked = property.status === "published";
  const editingFields = mode === "edit" && !locked ? draft.fields : null;
  const editingImages = mode === "edit" && !locked ? draft.imageDraft : null;

  // Adjusting state during render (see components/properties/property-filters.tsx
  // for the same pattern): if the server re-sends a newer property — a
  // fresh navigation to this route, not something this component causes
  // itself — drop any local edit in progress and show the new data.
  if (initialProperty.updatedAt !== syncedUpdatedAt || initialProperty.id !== property.id) {
    setSyncedUpdatedAt(initialProperty.updatedAt);
    setProperty(initialProperty);
    setMode("view");
    if (draft.editing) draft.cancelEdit(); // revokes any staged image URLs
  }

  function handleEnterEdit() {
    draft.beginEdit(property);
    setMode("edit");
  }

  function handleCancelEdit() {
    draft.cancelEdit();
    setMode("view");
  }

  function handleQuickStatus(status: PropertyStatus) {
    setQuickError(null);
    startQuickTransition(async () => {
      const result = await updatePropertyAction(property.id, { status });
      if (!result.ok) {
        setQuickError(result.error);
        return;
      }
      handleSaved(result.data);
    });
  }

  const location = composeLocation(property);
  const mapsHref =
    property.latitude !== null && property.longitude !== null
      ? `https://www.google.com/maps?q=${property.latitude},${property.longitude}`
      : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            {editingFields ? (
              <TitleField fields={editingFields} updateField={draft.updateField} pending={draft.pending} />
            ) : (
              <h1 className="text-2xl font-semibold text-primary">{property.title}</h1>
            )}
            {editingFields ? (
              <FeaturedToggle fields={editingFields} updateField={draft.updateField} pending={draft.pending} />
            ) : (
              property.isFeatured && (
                <Badge variant="accent" className="inline-flex items-center gap-1">
                  <Star className="size-3" />
                  Unggulan
                </Badge>
              )
            )}
            {draft.justSaved && (
              <span role="status" className="text-sm font-medium text-ring">
                Tersimpan
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{property.slug}</p>
        </div>

        <div className="flex items-center gap-2">
          {editingFields ? (
            <>
              <StatusAndListingControls fields={editingFields} updateField={draft.updateField} pending={draft.pending} />
              <Button variant="secondary" onClick={draft.save} disabled={draft.pending || !draft.isDirty}>
                <Check className="size-4" />
                {draft.pending ? "Menyimpan…" : "Simpan perubahan"}
              </Button>
              <Button variant="outlineSecondary" onClick={handleCancelEdit} disabled={draft.pending}>
                <X className="size-4" />
                Batal
              </Button>
            </>
          ) : (
            <>
              <PropertyStatusBadge status={property.status} />
              <ListingTypeBadge listingType={property.listingType} />
              {mode === "view" && !locked && (
                <Button variant="secondary" onClick={handleEnterEdit}>
                  <Pencil className="size-4" />
                  Edit
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {editingFields && draft.error && (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {draft.error}
        </p>
      )}

      {locked && (
        <div className="flex flex-col gap-3 rounded-lg border border-accent/60 bg-accent/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-2 text-sm text-primary">
            <Lock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span>
              Properti yang sudah <strong>terbit</strong> tidak dapat diedit. Jadikan draf atau arsipkan
              terlebih dahulu untuk mengubah data atau gambar.
            </span>
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => handleQuickStatus("draft")} disabled={quickPending}>
              {quickPending ? "Memproses…" : "Jadikan draf"}
            </Button>
            <Button
              variant="outlineSecondary"
              size="sm"
              onClick={() => handleQuickStatus("archived")}
              disabled={quickPending}
            >
              {quickPending ? "Memproses…" : "Arsipkan"}
            </Button>
          </div>
        </div>
      )}

      {mode === "view" && property.status === "draft" && (
        <div className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-primary">Properti ini masih berstatus draf dan belum tampil di situs publik.</p>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => handleQuickStatus("published")} disabled={quickPending}>
              {quickPending ? "Memproses…" : "Terbitkan"}
            </Button>
            <Button
              variant="outlineSecondary"
              size="sm"
              onClick={() => handleQuickStatus("archived")}
              disabled={quickPending}
            >
              {quickPending ? "Memproses…" : "Arsipkan"}
            </Button>
          </div>
        </div>
      )}

      {quickError && (
        <p role="alert" className="text-sm text-destructive">
          {quickError}
        </p>
      )}

      <DetailCard title="Gambar">
        {editingImages ? (
          <PropertyImagesEditor
            draft={editingImages}
            title={property.title}
            pending={draft.pending}
            onAddFile={draft.addImage}
            onRemove={draft.removeImage}
            onSetCover={draft.setImageCover}
            onAltChange={draft.setImageAlt}
          />
        ) : (
          <PropertyImagesGallery images={property.images} title={property.title} />
        )}
      </DetailCard>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <DetailCard title="Deskripsi">
            {editingFields ? (
              <DescriptionField fields={editingFields} updateField={draft.updateField} pending={draft.pending} />
            ) : (
              <RichTextView html={property.description} scrollable />
            )}
          </DetailCard>

          <DetailCard title="Fasilitas">
            {editingFields ? (
              <AmenitiesField
                amenities={amenities}
                fields={editingFields}
                toggleAmenity={draft.toggleAmenity}
                pending={draft.pending}
              />
            ) : (
              <PropertyAmenities amenities={property.amenities} />
            )}
          </DetailCard>
        </div>

        <div className="flex flex-col gap-6">
          <DetailCard title="Spesifikasi">
            {editingFields ? (
              <SpecFields
                fields={editingFields}
                updateField={draft.updateField}
                propertyTypes={propertyTypes}
                pending={draft.pending}
              />
            ) : (
              <>
                <DetailRow
                  label="Harga"
                  value={property.price !== null ? `${formatIDRFull(property.price)} ${property.currency}` : "—"}
                />
                <DetailRow label="Kategori" value={property.propertyType?.name ?? "—"} />
                <DetailRow label="Kamar tidur" value={property.bedrooms ?? "—"} />
                <DetailRow label="Kamar mandi" value={property.bathrooms ?? "—"} />
                <DetailRow label="Luas" value={property.areaSqm !== null ? `${property.areaSqm} m²` : "—"} />
              </>
            )}
          </DetailCard>

          <DetailCard title="Lokasi">
            {editingFields ? (
              <LocationFields fields={editingFields} updateField={draft.updateField} pending={draft.pending} />
            ) : (
              <>
                <p className="flex items-start gap-2 text-sm text-primary">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <span>{property.address || location || "Belum diisi"}</span>
                </p>
                {location && property.address && <p className="text-sm text-muted-foreground">{location}</p>}
                {mapsHref && (
                  <a
                    href={mapsHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                  >
                    Buka di Google Maps
                    <ExternalLink className="size-3.5" />
                  </a>
                )}
              </>
            )}
          </DetailCard>

          {(editingFields ? editingFields.listingType : property.listingType) === "new" && (
            <DetailCard title="Properti baru">
              {editingFields ? (
                <NewPropertyFields fields={editingFields} updateField={draft.updateField} pending={draft.pending} />
              ) : (
                <>
                  <DetailRow
                    label="Tanggal serah terima"
                    value={property.handoverDate ? formatDateID(property.handoverDate) : "—"}
                  />
                  <DetailRow
                    label="Status konstruksi"
                    value={property.constructionStatus ? CONSTRUCTION_STATUS_LABEL[property.constructionStatus] : "—"}
                  />
                </>
              )}
            </DetailCard>
          )}

          {/* Neither of these two cards is part of AdminPropertyUpdateInput
              — agent assignment and the created/updated timestamps aren't
              editable from this page at all, in either mode. tone="readonly"
              only activates while mode is "edit", specifically because
              that's the only moment these cards sit next to siblings that
              ARE inputs — in view mode there's nothing to contrast against. */}
          <DetailCard
            title="Agen"
            tone={editingFields ? "readonly" : "default"}
            action={editingFields ? <Lock className="size-3.5 text-muted-foreground" /> : undefined}
          >
            {editingFields && (
              <p className="text-xs text-muted-foreground">Info agen tidak dapat diubah dari halaman ini.</p>
            )}
            {property.agent ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="relative size-10 shrink-0 overflow-hidden rounded-full bg-muted">
                    {property.agent.photo ? (
                      <Image
                        src={property.agent.photo.url}
                        alt={property.agent.photo.alt ?? property.agent.name}
                        fill
                        className="object-cover"
                        sizes="40px"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                        <User className="size-5" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-primary">{property.agent.name}</p>
                    {property.agent.title && (
                      <p className="truncate text-xs text-muted-foreground">{property.agent.title}</p>
                    )}
                  </div>
                </div>
                {property.agent.phone && (
                  <a
                    href={`tel:${property.agent.phone}`}
                    className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    <Phone className="size-3.5" />
                    {property.agent.phone}
                  </a>
                )}
                {property.agent.whatsapp && (
                  <a
                    href={`https://wa.me/${toWaNumber(property.agent.whatsapp)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    <MessageCircle className="size-3.5" />
                    WhatsApp
                  </a>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Belum ada agen ditugaskan.</p>
            )}
          </DetailCard>

          <DetailCard
            title="Metadata"
            tone={editingFields ? "readonly" : "default"}
            action={editingFields ? <Lock className="size-3.5 text-muted-foreground" /> : undefined}
          >
            <DetailRow label="Dibuat" value={formatDate(property.createdAt)} />
            <DetailRow label="Diperbarui" value={formatDate(property.updatedAt)} />
          </DetailCard>
        </div>
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}
