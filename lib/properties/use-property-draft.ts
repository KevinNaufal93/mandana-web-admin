"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { updatePropertyAction } from "@/app/actions/properties";
import { uploadMediaAction } from "@/app/actions/media";
import {
  initImageDraft,
  addFile as addImageFile,
  removeSlot as removeImageSlot,
  setAlt as setImageSlotAlt,
  setCover as setImageSlotCover,
  buildMediaUploadFormData,
  buildImagesPayload,
  hasImageChanges,
  revokeAllPreviewUrls,
  type ImageDraft,
} from "@/lib/properties/image-staging";
import {
  fieldsFromProperty,
  validateFields,
  isFieldsDirty,
  buildUpdatePatch,
  type DraftFields,
} from "@/lib/properties/draft-fields";
import type { AdminPropertyDetail } from "@/lib/api/properties";

export type { DraftFields };

/**
 * Owns every piece of state the property detail page's edit mode needs:
 * field values, the staged image list, validation, dirty-tracking, and
 * the save itself.
 *
 * Save used to be several sequenced network calls (see
 * docs/api-property-images.md for the history) with partial-failure
 * recovery folded back into the draft, because the write API had no
 * batch/desired-state endpoint for images. That gap has closed — PATCH
 * /admin/properties/:id now accepts a complete-desired-state `images`
 * array and applies it atomically alongside any field changes — so save()
 * is now: upload any newly-staged files to /admin/media/upload in
 * parallel, then one PATCH carrying both the field patch and the images
 * array. A failed PATCH leaves the server untouched (it's a single
 * transaction); the only thing worth remembering across a retry is which
 * files already made it to a mediaAssetId, so a second Save doesn't
 * re-upload (and orphan) them.
 *
 * Deliberately does NOT track `property` as a prop the way most hooks
 * would — reseeding is 100% explicit via beginEdit(property), never
 * ambient. See property-detail-view.tsx's resync-forces-view-mode
 * behavior for why an ambient watcher here would be solving a problem
 * that can't occur.
 */
export function usePropertyDraft(onSaved: (fresh: AdminPropertyDetail) => void) {
  const [fields, setFields] = useState<DraftFields | null>(null);
  const [imageDraft, setImageDraft] = useState<ImageDraft | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const baselineRef = useRef<AdminPropertyDetail | null>(null);
  const [baselineFields, setBaselineFields] = useState<DraftFields | null>(null);

  // Survives across a failed-then-retried save: key -> mediaAssetId for
  // every staged file that has already been uploaded. Cleared whenever a
  // fresh edit session begins or ends. A ref, not state — it's only read
  // from inside save(), never during render.
  const uploadedRef = useRef<Map<string, string>>(new Map());

  // Cancel and beginEdit both clear this explicitly. This covers the one
  // path those don't: navigating away entirely while mid-edit with an
  // un-saved staged file, which unmounts this hook without ever calling
  // cancelEdit(). Kept in sync via effect (not written during render) so
  // the unmount-only cleanup always sees the latest draft.
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
    uploadedRef.current = new Map();
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
    uploadedRef.current = new Map();
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
      const id = baselineRef.current!.id;

      // Upload any staged files not already uploaded from a prior failed
      // attempt. Parallel — these are independent, unrelated requests.
      const toUpload = imageDraft.slots.filter((s) => s.kind === "new" && !uploadedRef.current.has(s.key));
      const uploadResults = await Promise.all(
        toUpload.map(async (slot) => {
          if (slot.kind !== "new") return null; // narrows for TS; filter above already guarantees this
          const result = await uploadMediaAction(buildMediaUploadFormData(slot.file, slot.alt.trim()));
          return { key: slot.key, result };
        }),
      );
      for (const entry of uploadResults) {
        if (!entry) continue;
        if (!entry.result.ok) {
          setError(entry.result.error);
          return;
        }
        uploadedRef.current.set(entry.key, entry.result.data.id);
      }

      const patch = {
        ...buildUpdatePatch(fields),
        images: isImagesDirty ? buildImagesPayload(imageDraft, uploadedRef.current) : undefined,
      };

      const result = await updatePropertyAction(id, patch);
      if (!result.ok) {
        setError(result.error);
        return;
      }

      onSaved(result.data);
      setFields(null);
      setImageDraft(null);
      baselineRef.current = null;
      setBaselineFields(null);
      uploadedRef.current = new Map();
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
