"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { MapPin, MessageCircle, Phone, Pencil, ExternalLink, Star, User, Lock } from "lucide-react";
import { PropertyStatusBadge, ListingTypeBadge } from "@/components/properties/property-status-badge";
import { PropertyImagesManager } from "@/components/properties/property-images-manager";
import { PropertyAmenities } from "@/components/properties/property-amenities";
import { RichTextView } from "@/components/ui/rich-text-view";
import { PropertyEditForm } from "@/components/properties/property-edit-form";
import { DetailCard, DetailRow } from "@/components/ui/detail-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { updatePropertyAction } from "@/app/actions/properties";
import { composeLocation, formatIDRFull, toWaNumber } from "@/lib/format";
import type { AdminPropertyDetail, AdminPropertyAmenity, PropertyTypeOption } from "@/lib/api/properties";

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
  const [unlockPending, startUnlockTransition] = useTransition();
  const [unlockError, setUnlockError] = useState<string | null>(null);

  // Published listings are live on the public site — editing fields or
  // images out from under a published property is the guard this whole
  // block exists to prevent. The only way out is the two buttons below,
  // which only ever touch `status`, never the content fields.
  const locked = property.status === "published";

  // Adjusting state during render (see components/properties/property-filters.tsx
  // for the same pattern): if the server re-sends a newer property — a
  // fresh navigation to this route, not something this component causes
  // itself — drop any local edit in progress and show the new data.
  const [syncedUpdatedAt, setSyncedUpdatedAt] = useState(initialProperty.updatedAt);
  if (initialProperty.updatedAt !== syncedUpdatedAt || initialProperty.id !== property.id) {
    setSyncedUpdatedAt(initialProperty.updatedAt);
    setProperty(initialProperty);
    setMode("view");
  }

  function handleSaved(fresh: AdminPropertyDetail) {
    setProperty(fresh);
    setSyncedUpdatedAt(fresh.updatedAt);
    setMode("view");
  }

  function handleImagesChanged(fresh: AdminPropertyDetail) {
    setProperty(fresh);
    setSyncedUpdatedAt(fresh.updatedAt);
  }

  function handleUnlock(status: "draft" | "archived") {
    setUnlockError(null);
    startUnlockTransition(async () => {
      const result = await updatePropertyAction(property.id, { status });
      if (!result.ok) {
        setUnlockError(result.error);
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
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-primary">{property.title}</h1>
            {property.isFeatured && (
              <Badge variant="accent" className="inline-flex items-center gap-1">
                <Star className="size-3" />
                Unggulan
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{property.slug}</p>
        </div>
        <div className="flex items-center gap-2">
          <PropertyStatusBadge status={property.status} />
          <ListingTypeBadge listingType={property.listingType} />
          {mode === "view" && !locked && (
            <Button variant="secondary" onClick={() => setMode("edit")}>
              <Pencil className="size-4" />
              Edit
            </Button>
          )}
        </div>
      </div>

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
            <Button variant="secondary" size="sm" onClick={() => handleUnlock("draft")} disabled={unlockPending}>
              Jadikan draf
            </Button>
            <Button variant="outlineSecondary" size="sm" onClick={() => handleUnlock("archived")} disabled={unlockPending}>
              Arsipkan
            </Button>
          </div>
        </div>
      )}
      {unlockError && (
        <p role="alert" className="text-sm text-destructive">
          {unlockError}
        </p>
      )}

      <PropertyImagesManager
        propertyId={property.id}
        images={property.images}
        title={property.title}
        locked={locked}
        onChange={handleImagesChanged}
      />

      {mode === "edit" && !locked ? (
        <PropertyEditForm
          property={property}
          propertyTypes={propertyTypes}
          amenities={amenities}
          onSaved={handleSaved}
          onCancel={() => setMode("view")}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-6 lg:col-span-2">
            <DetailCard title="Deskripsi">
              <RichTextView html={property.description} />
            </DetailCard>

            <DetailCard title="Fasilitas">
              <PropertyAmenities amenities={property.amenities} />
            </DetailCard>
          </div>

          <div className="flex flex-col gap-6">
            <DetailCard title="Spesifikasi">
              <DetailRow
                label="Harga"
                value={property.price !== null ? `${formatIDRFull(property.price)} ${property.currency}` : "—"}
              />
              <DetailRow label="Kategori" value={property.propertyType?.name ?? "—"} />
              <DetailRow label="Kamar tidur" value={property.bedrooms ?? "—"} />
              <DetailRow label="Kamar mandi" value={property.bathrooms ?? "—"} />
              <DetailRow label="Luas" value={property.areaSqm !== null ? `${property.areaSqm} m²` : "—"} />
            </DetailCard>

            <DetailCard title="Lokasi">
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
            </DetailCard>

            <DetailCard title="Agen">
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

            <DetailCard title="Metadata">
              <DetailRow label="Dibuat" value={formatDate(property.createdAt)} />
              <DetailRow label="Diperbarui" value={formatDate(property.updatedAt)} />
            </DetailCard>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}
