"use client";

import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DetailCard } from "@/components/ui/detail-card";
import { PropertyImagesEditor } from "@/components/properties/property-images-field";
import {
  StatusAndListingControls,
  FeaturedToggle,
  DescriptionField,
  AmenitiesField,
  SpecFields,
  LocationFields,
  NewPropertyFields,
} from "@/components/properties/property-edit-fields";
import { useCreatePropertyDraft } from "@/lib/properties/use-create-property-draft";
import { NONE } from "@/lib/properties/draft-fields";
import type { AdminPropertyAmenity, PropertyTypeOption } from "@/lib/api/properties";
import type { AdminUser } from "@/lib/api/users";

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label htmlFor={htmlFor}>{label}</Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

export function PropertyCreateForm({
  propertyTypes,
  amenities,
  agents,
  currentUserId,
}: {
  propertyTypes: PropertyTypeOption[];
  amenities: AdminPropertyAmenity[];
  agents: AdminUser[];
  currentUserId: string;
}) {
  const router = useRouter();
  const draft = useCreatePropertyDraft((id) => router.push(`/properties/${id}`));
  const { fields } = draft;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-xl flex-1">
          <Label htmlFor="create-title">Judul properti</Label>
          <Input
            id="create-title"
            value={fields.title}
            onChange={(e) => draft.updateField("title", e.target.value)}
            disabled={draft.pending}
            placeholder="Villa Canggu Bali"
            className="mt-1.5 h-auto py-1 text-2xl font-semibold"
          />
        </div>
        <div className="flex items-center gap-3 pt-6">
          <FeaturedToggle fields={fields} updateField={draft.updateField} pending={draft.pending} />
          <StatusAndListingControls fields={fields} updateField={draft.updateField} pending={draft.pending} />
        </div>
      </div>

      {draft.error && (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {draft.error}
        </p>
      )}

      {fields.status === "published" && (
        <div className="flex items-start gap-2 rounded-lg border border-accent/60 bg-accent/10 p-4 text-sm text-primary">
          <Lock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <span>
            Properti yang dibuat langsung sebagai <strong>terbit</strong> akan langsung tampil di situs publik, dan
            tidak dapat diedit sampai dijadikan draf atau diarsipkan.
          </span>
        </div>
      )}

      <DetailCard title="Gambar">
        <PropertyImagesEditor
          draft={draft.imageDraft}
          title={fields.title || "Properti baru"}
          pending={draft.pending}
          onAddFile={draft.addImage}
          onRemove={draft.removeImage}
          onSetCover={draft.setImageCover}
          onAltChange={draft.setImageAlt}
        />
      </DetailCard>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <DetailCard title="Deskripsi">
            <DescriptionField fields={fields} updateField={draft.updateField} pending={draft.pending} />
          </DetailCard>

          <DetailCard title="Fasilitas">
            <AmenitiesField
              amenities={amenities}
              fields={fields}
              toggleAmenity={draft.toggleAmenity}
              pending={draft.pending}
            />
          </DetailCard>
        </div>

        <div className="flex flex-col gap-6">
          <DetailCard title="Spesifikasi">
            <SpecFields fields={fields} updateField={draft.updateField} propertyTypes={propertyTypes} pending={draft.pending} />
          </DetailCard>

          <DetailCard title="Lokasi">
            <LocationFields fields={fields} updateField={draft.updateField} pending={draft.pending} />
          </DetailCard>

          {fields.listingType === "new" && (
            <DetailCard title="Properti baru">
              <NewPropertyFields fields={fields} updateField={draft.updateField} pending={draft.pending} />
            </DetailCard>
          )}

          <DetailCard title="Agen">
            <Field label="Agen properti" htmlFor="create-agent">
              <Select value={fields.agentId} onValueChange={(v) => draft.updateField("agentId", v)}>
                <SelectTrigger id="create-agent" className="w-full" disabled={draft.pending}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Saya (bawaan)</SelectItem>
                  {agents
                    .filter((a) => a.id !== currentUserId)
                    .map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </Field>
          </DetailCard>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="secondary" onClick={draft.save} disabled={draft.pending}>
          {draft.pending ? "Membuat…" : "Buat properti"}
        </Button>
        <Button variant="outlineSecondary" onClick={() => router.push("/properties")} disabled={draft.pending}>
          Batal
        </Button>
      </div>
    </div>
  );
}
