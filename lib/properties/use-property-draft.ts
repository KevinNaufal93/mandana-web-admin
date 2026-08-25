"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  updatePropertyAction,
  uploadPropertyImageAction,
  updatePropertyImageAction,
  deletePropertyImageAction,
} from "@/app/actions/properties";
import {
  initImageDraft,
  addFile as addImageFile,
  removeSlot as removeImageSlot,
  setAlt as setImageSlotAlt,
  setCover as setImageSlotCover,
  commitUpload,
  commitDelete,
  commitExistingPatch,
  planImageCommit,
  buildUploadFormData,
  revokeAllPreviewUrls,
  type ImageDraft,
} from "@/lib/properties/image-staging";
import type { PropertyStatus, ListingType } from "@/lib/properties/query";
import type { AdminPropertyDetail, AdminPropertyUpdateInput } from "@/lib/api/properties";

const NONE = "none";

export interface DraftFields {
  title: string;
  description: string;
  listingType: ListingType;
  status: PropertyStatus;
  price: string;
  currency: string;
  bedrooms: string;
  bathrooms: string;
  areaSqm: string;
  address: string;
  area: string;
  city: string;
  province: string;
  latitude: string;
  longitude: string;
  isFeatured: boolean;
  propertyTypeId: string; // NONE sentinel, or a real id
  amenityIds: Set<string>;
}

function fieldsFromProperty(property: AdminPropertyDetail): DraftFields {
  return {
    title: property.title,
    description: property.description ?? "",
    listingType: property.listingType,
    status: property.status,
    price: property.price !== null ? String(property.price) : "",
    currency: property.currency,
    bedrooms: property.bedrooms !== null ? String(property.bedrooms) : "",
    bathrooms: property.bathrooms !== null ? String(property.bathrooms) : "",
    areaSqm: property.areaSqm !== null ? String(property.areaSqm) : "",
    address: property.address ?? "",
    area: property.area ?? "",
    city: property.city ?? "",
    province: property.province ?? "",
    latitude: property.latitude !== null ? String(property.latitude) : "",
    longitude: property.longitude !== null ? String(property.longitude) : "",
    isFeatured: property.isFeatured,
    propertyTypeId: property.propertyType?.id ?? NONE,
    amenityIds: new Set(property.amenities.map((a) => a.id)),
  };
}

function toNullableNumber(v: string): number | null {
  return v.trim() === "" ? null : Number(v);
}

function buildPatch(fields: DraftFields): AdminPropertyUpdateInput {
  return {
    title: fields.title.trim(),
    description: fields.description || null,
    listingType: fields.listingType,
    status: fields.status,
    price: Number(fields.price),
    currency: fields.currency.trim() || "IDR",
    bedrooms: toNullableNumber(fields.bedrooms),
    bathrooms: toNullableNumber(fields.bathrooms),
    areaSqm: toNullableNumber(fields.areaSqm),
    address: fields.address.trim() || null,
    area: fields.area.trim() || null,
    city: fields.city.trim() || null,
    province: fields.province.trim() || null,
    latitude: toNullableNumber(fields.latitude),
    longitude: toNullableNumber(fields.longitude),
    isFeatured: fields.isFeatured,
    propertyTypeId: fields.propertyTypeId === NONE ? null : fields.propertyTypeId,
    amenityIds: [...fields.amenityIds],
  };
}

function validateFields(fields: DraftFields): string | null {
  if (fields.title.trim().length < 2) return "Judul minimal 2 karakter.";
  const priceNumber = Number(fields.price);
  if (fields.price.trim() === "" || Number.isNaN(priceNumber) || priceNumber < 0) {
    return "Harga wajib diisi dengan angka yang valid.";
  }
  return null;
}

function isFieldsDirty(fields: DraftFields, baseline: DraftFields): boolean {
  if (
    fields.title !== baseline.title ||
    fields.description !== baseline.description ||
    fields.listingType !== baseline.listingType ||
    fields.status !== baseline.status ||
    fields.price !== baseline.price ||
    fields.currency !== baseline.currency ||
    fields.bedrooms !== baseline.bedrooms ||
    fields.bathrooms !== baseline.bathrooms ||
    fields.areaSqm !== baseline.areaSqm ||
    fields.address !== baseline.address ||
    fields.area !== baseline.area ||
    fields.city !== baseline.city ||
    fields.province !== baseline.province ||
    fields.latitude !== baseline.latitude ||
    fields.longitude !== baseline.longitude ||
    fields.isFeatured !== baseline.isFeatured ||
    fields.propertyTypeId !== baseline.propertyTypeId
  ) {
    return true;
  }
  if (fields.amenityIds.size !== baseline.amenityIds.size) return true;
  for (const id of fields.amenityIds) if (!baseline.amenityIds.has(id)) return true;
  return false;
}

/**
 * Owns every piece of state the property detail page's edit mode needs:
 * field values, the staged image list, validation, dirty-tracking, and the
 * save sequence itself (see docs/api-property-images.md for why a save is
 * several ordered network calls instead of one).
 *
 * Deliberately does NOT track `property` as a prop the way most hooks
 * would — reseeding is 100% explicit via beginEdit(property), never
 * ambient. The property detail page's own "a fresher property arrived from
 * the server, drop any local edit" resync (see property-detail-view.tsx)
 * already forces `mode` back to "view" whenever that happens, which is the
 * only case an ambient re-seed here would ever need to handle — so an
 * ambient watcher would be solving a problem that can't actually occur,
 * while adding a real one: it would also fire on THIS hook's own partial-
 * failure sync (see save() below), silently wiping whatever the user was
 * mid-edit on. Explicit beginEdit sidesteps that class of bug entirely.
 */
export function usePropertyDraft(onSaved: (fresh: AdminPropertyDetail) => void, onSyncProperty: (fresh: AdminPropertyDetail) => void) {
  const [fields, setFields] = useState<DraftFields | null>(null);
  const [imageDraft, setImageDraft] = useState<ImageDraft | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  // The property this draft is diffed against — set by beginEdit, advanced
  // (without touching `fields`/`imageDraft`) after a partial save failure,
  // so a retry only re-attempts what didn't already land. A plain ref: it's
  // only ever read from inside save()/beginEdit()/cancelEdit(), never
  // during render, so it doesn't need to trigger a re-render on its own.
  const baselineRef = useRef<AdminPropertyDetail | null>(null);
  // baselineFields, unlike baselineRef above, DOES feed a value rendered
  // during this render (isDirty, which the Save button's disabled state
  // depends on) — so it has to be state, not a ref, or the UI could go
  // stale after a change that doesn't otherwise trigger a re-render.
  const [baselineFields, setBaselineFields] = useState<DraftFields | null>(null);

  // Cancel and the various commit* paths already revoke object URLs for
  // the specific slots they retire. This covers the one path those don't:
  // navigating away entirely while mid-edit with an un-saved staged file,
  // which unmounts this hook without ever calling cancelEdit(). A ref kept
  // in sync via effect (not written during render — see the isDirty
  // comment above for why that distinction matters here) so the
  // unmount-only cleanup below always sees the latest draft, not whatever
  // was current on first mount.
  const imageDraftRef = useRef(imageDraft);
  useEffect(() => {
    imageDraftRef.current = imageDraft;
  }, [imageDraft]);
  useEffect(() => {
    return () => {
      if (imageDraftRef.current) revokeAllPreviewUrls(imageDraftRef.current);
    };
  }, []);

  const editing = fields !== null && imageDraft !== null;
  const isImagesDirty = imageDraft ? hasImageChanges(imageDraft) : false;
  const isDirty = editing && ((fields && baselineFields ? isFieldsDirty(fields, baselineFields) : false) || isImagesDirty);

  function beginEdit(property: AdminPropertyDetail) {
    baselineRef.current = property;
    setBaselineFields(fieldsFromProperty(property));
    setFields(fieldsFromProperty(property));
    setImageDraft(initImageDraft(property.images));
    setError(null);
    setJustSaved(false);
  }

  function cancelEdit() {
    if (imageDraft) revokeAllPreviewUrls(imageDraft);
    setFields(null);
    setImageDraft(null);
    setError(null);
    baselineRef.current = null;
    setBaselineFields(null);
  }

  function updateField<K extends keyof DraftFields>(key: K, value: DraftFields[K]) {
    setFields((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function toggleAmenity(id: string) {
    setFields((prev) => {
      if (!prev) return prev;
      const next = new Set(prev.amenityIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { ...prev, amenityIds: next };
    });
  }

  function addImage(file: File) {
    setImageDraft((prev) => (prev ? addImageFile(prev, file) : prev));
  }
  function removeImage(key: string) {
    setImageDraft((prev) => (prev ? removeImageSlot(prev, key) : prev));
  }
  function setImageAlt(key: string, alt: string) {
    setImageDraft((prev) => (prev ? setImageSlotAlt(prev, key, alt) : prev));
  }
  function setImageCover(key: string) {
    setImageDraft((prev) => (prev ? setImageSlotCover(prev, key) : prev));
  }

  function save() {
    if (!fields || !imageDraft || !baselineRef.current) return;
    const validationError = validateFields(fields);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    startTransition(async () => {
      let latest = baselineRef.current!;
      let workingDraft = imageDraft;

      if (baselineFields && isFieldsDirty(fields, baselineFields)) {
        const result = await updatePropertyAction(latest.id, buildPatch(fields));
        if (!result.ok) {
          setError(result.error);
          return; // Nothing image-related attempted yet — draft untouched.
        }
        latest = result.data;
      }

      const plan = planImageCommit(workingDraft);
      let failure: string | null = null;

      for (const op of plan.uploads) {
        const knownIds = new Set(latest.images.map((img) => img.id));
        const result = await uploadPropertyImageAction(latest.id, buildUploadFormData(op));
        if (!result.ok) {
          failure = result.error;
          break;
        }
        latest = result.data;
        // Identify which of the returned images is the one just uploaded
        // so the "new" slot can become "existing" — see the module doc
        // comment in image-staging.ts (commitUpload) for why this matters
        // for retry-safety. If exactly one new id doesn't appear (e.g. a
        // concurrent edit from elsewhere), leave the slot as-is rather
        // than guessing which one is "ours".
        const appeared = latest.images.filter((img) => !knownIds.has(img.id));
        if (appeared.length === 1) {
          workingDraft = commitUpload(workingDraft, op.key, appeared[0]);
        }
      }

      if (!failure) {
        for (const op of plan.existingPatches) {
          const result = await updatePropertyImageAction(latest.id, op.imageId, op.patch);
          if (!result.ok) {
            failure = result.error;
            break;
          }
          latest = result.data;
          workingDraft = commitExistingPatch(workingDraft, op.key, op.patch);
        }
      }

      if (!failure) {
        for (const op of plan.deletes) {
          const result = await deletePropertyImageAction(latest.id, op.imageId);
          if (!result.ok) {
            failure = result.error;
            break;
          }
          latest = result.data;
          workingDraft = commitDelete(workingDraft, op.imageId);
        }
      }

      if (failure) {
        // Advance the baseline to whatever DID land, but leave the user's
        // remaining draft (fields + not-yet-committed image ops) exactly
        // as they left it — they're still in edit mode, looking at an
        // error, and a second Save click should only retry what's left.
        // baselineFields specifically has to advance too: if the field
        // patch succeeded before an image step failed, `fields` (still the
        // same values the user typed) must now be compared against THIS
        // new baseline, or a retry would re-send an already-applied field
        // patch.
        baselineRef.current = latest;
        setBaselineFields(fieldsFromProperty(latest));
        setImageDraft(workingDraft);
        setError(failure);
        onSyncProperty(latest);
        return;
      }

      onSaved(latest);
      setFields(null);
      setImageDraft(null);
      baselineRef.current = null;
      setBaselineFields(null);
      setJustSaved(true);
      window.setTimeout(() => setJustSaved(false), 3000);
    });
  }

  return {
    editing,
    fields,
    updateField,
    toggleAmenity,
    imageDraft,
    addImage,
    removeImage,
    setImageAlt,
    setImageCover,
    pending,
    error,
    justSaved,
    isDirty,
    beginEdit,
    cancelEdit,
    save,
  };
}

function hasImageChanges(draft: ImageDraft): boolean {
  const plan = planImageCommit(draft);
  return plan.uploads.length > 0 || plan.existingPatches.length > 0 || plan.deletes.length > 0;
}
