"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPropertyAction, updatePropertyAction } from "@/app/actions/properties";
import { uploadMediaAction } from "@/app/actions/media";
import {
  emptyImageDraft,
  addFile as addImageFile,
  removeSlot as removeImageSlot,
  setAlt as setImageSlotAlt,
  setCover as setImageSlotCover,
  visibleSlots,
  buildMediaUploadFormData,
  buildImagesPayload,
  revokeAllPreviewUrls,
  type ImageDraft,
} from "@/lib/properties/image-staging";
import { emptyDraftFields, validateFields, buildCreateInput, type DraftFields } from "@/lib/properties/draft-fields";

const MAX_IMAGES = 40;

/**
 * Mirrors usePropertyDraft's shape (field state, staged images, pending/
 * error, save()) but for the one-shot create flow rather than an
 * in-place edit session — there is no baseline to diff against, and no
 * beginEdit/cancelEdit lifecycle; the form is "editing" for its entire
 * mounted lifetime.
 *
 * Save order: upload every staged file to /admin/media/upload in
 * parallel first, then POST /admin/properties for the fields, then (only
 * if any images were staged) one PATCH carrying the images array. Uploads
 * go before create so a failed upload leaves no property behind; create
 * goes before the images PATCH because CreatePropertyDto has no images
 * field (the API 400s on an unknown key). Every step memoizes what
 * already landed in a ref, so a retry after a failure only re-attempts
 * what didn't — clicking Save twice must never produce two properties or
 * two copies of a photo.
 */
export function useCreatePropertyDraft(onCreated: (id: string) => void) {
  const [fields, setFields] = useState<DraftFields>(emptyDraftFields());
  const [imageDraft, setImageDraft] = useState<ImageDraft>(emptyImageDraft());
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const uploadedRef = useRef<Map<string, string>>(new Map());
  const createdIdRef = useRef<string | null>(null);

  const imageDraftRef = useRef(imageDraft);
  useEffect(() => {
    imageDraftRef.current = imageDraft;
  }, [imageDraft]);
  useEffect(() => {
    return () => revokeAllPreviewUrls(imageDraftRef.current);
  }, []);

  function updateField<K extends keyof DraftFields>(key: K, value: DraftFields[K]) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  function toggleAmenity(id: string) {
    setFields((prev) => {
      const next = new Set(prev.amenityIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { ...prev, amenityIds: next };
    });
  }

  function addImage(file: File) {
    setImageDraft((prev) => addImageFile(prev, file));
  }
  function removeImage(key: string) {
    setImageDraft((prev) => removeImageSlot(prev, key));
  }
  function setImageAlt(key: string, alt: string) {
    setImageDraft((prev) => setImageSlotAlt(prev, key, alt));
  }
  function setImageCover(key: string) {
    setImageDraft((prev) => setImageSlotCover(prev, key));
  }

  function save() {
    const validationError = validateFields(fields);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (visibleSlots(imageDraft).length > MAX_IMAGES) {
      setError(`Maksimal ${MAX_IMAGES} gambar per properti.`);
      return;
    }

    setError(null);
    startTransition(async () => {
      // 1. Upload any staged files not already uploaded from a prior
      //    failed attempt.
      const toUpload = imageDraft.slots.filter((s) => s.kind === "new" && !uploadedRef.current.has(s.key));
      const uploadResults = await Promise.all(
        toUpload.map(async (slot) => {
          if (slot.kind !== "new") return null;
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

      // 2. Create the property itself, unless a prior attempt already
      //    got this far.
      let id = createdIdRef.current;
      if (!id) {
        const result = await createPropertyAction(buildCreateInput(fields));
        if (!result.ok) {
          setError(result.error);
          return;
        }
        id = result.data.id;
        createdIdRef.current = id;
      }

      // 3. Attach staged images, if any — CreatePropertyDto has no images
      //    field, so this is always a follow-up PATCH, never part of step 2.
      if (visibleSlots(imageDraft).length > 0) {
        const result = await updatePropertyAction(id, {
          images: buildImagesPayload(imageDraft, uploadedRef.current),
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }
      }

      onCreated(id);
    });
  }

  return {
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
    save,
  };
}
