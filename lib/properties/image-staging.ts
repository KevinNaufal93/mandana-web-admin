import type { AdminPropertyImage, PropertyImageInputEntry } from "@/lib/api/properties";

/**
 * Client-side staging for the property image field. Purely local state —
 * nothing here reaches the network or a mediaAssetId until the caller
 * asks for one. Pure and framework-free on purpose (no React, no
 * fetch): every function takes a draft in, returns a new draft out.
 * `usePropertyDraft` / `useCreatePropertyDraft` are the only callers.
 *
 * The commit shape used to be a multi-step sequenced plan (upload each
 * new file, patch each changed existing image, delete each removed one,
 * in that order, with partial-failure recovery folded back into the
 * draft) — see docs/api-property-images.md for why. That API gap has
 * since closed: PATCH /admin/properties/:id now accepts a single
 * `images` array describing the complete desired end state, applied
 * atomically alongside any field changes. `buildImagesPayload` below
 * replaces the whole plan/commit machinery with one pure mapping.
 */

export type ImageSlot =
  | { key: string; kind: "existing"; image: AdminPropertyImage; alt: string; removed: boolean }
  | { key: string; kind: "new"; file: File; previewUrl: string; alt: string };

export interface ImageDraft {
  slots: ImageSlot[];
  /** key of whichever slot is the chosen cover, or null if none (only
   *  possible when every slot has been removed). Tracked separately from
   *  the slots rather than as a per-slot flag so "pick a new cover" is a
   *  one-field assignment instead of an unset-everyone-else pass. */
  coverKey: string | null;
}

let nextKey = 0;
/** Client-only identity for a not-yet-uploaded slot — never sent to the API. */
function newSlotKey(): string {
  nextKey += 1;
  return `new-${nextKey}-${Date.now()}`;
}

export function initImageDraft(images: AdminPropertyImage[]): ImageDraft {
  const slots: ImageSlot[] = images.map((image) => ({
    key: image.id,
    kind: "existing",
    image,
    alt: image.alt ?? "",
    removed: false,
  }));
  const cover = images.find((img) => img.isCover) ?? images[0] ?? null;
  return { slots, coverKey: cover?.id ?? null };
}

/** An empty draft for the create form — no existing images to seed from. */
export function emptyImageDraft(): ImageDraft {
  return { slots: [], coverKey: null };
}

/** Revokes every "new" slot's object URL — call on cancel and on unmount. */
export function revokeAllPreviewUrls(draft: ImageDraft): void {
  for (const slot of draft.slots) {
    if (slot.kind === "new") URL.revokeObjectURL(slot.previewUrl);
  }
}

/** Slots the UI should actually render — removed-but-not-yet-committed
 *  existing slots stay in `draft.slots` (buildImagesPayload still needs
 *  their absence to mean "delete") but disappear from view immediately. */
export function visibleSlots(draft: ImageDraft): ImageSlot[] {
  return draft.slots.filter((s) => !(s.kind === "existing" && s.removed));
}

export function addFile(draft: ImageDraft, file: File): ImageDraft {
  const key = newSlotKey();
  const slot: ImageSlot = { key, kind: "new", file, previewUrl: URL.createObjectURL(file), alt: "" };
  const hadAnyVisible = visibleSlots(draft).length > 0;
  return {
    slots: [...draft.slots, slot],
    // First image staged (existing + new both empty) becomes the cover by
    // default, same as the old always-on manager's upload-time behavior.
    coverKey: hadAnyVisible ? draft.coverKey : key,
  };
}

export function removeSlot(draft: ImageDraft, key: string): ImageDraft {
  const target = draft.slots.find((s) => s.key === key);
  if (!target) return draft;

  if (target.kind === "new") URL.revokeObjectURL(target.previewUrl);

  const slots = target.kind === "new"
    ? draft.slots.filter((s) => s.key !== key)
    : draft.slots.map((s) => (s.key === key ? { ...s, removed: true } : s));

  let coverKey = draft.coverKey;
  if (coverKey === key) {
    const next = slots.find((s) => !(s.kind === "existing" && s.removed));
    coverKey = next?.key ?? null;
  }
  return { slots, coverKey };
}

export function setAlt(draft: ImageDraft, key: string, alt: string): ImageDraft {
  return {
    ...draft,
    slots: draft.slots.map((s) => (s.key === key ? { ...s, alt } : s)),
  };
}

export function setCover(draft: ImageDraft, key: string): ImageDraft {
  const exists = draft.slots.some((s) => s.key === key && !(s.kind === "existing" && s.removed));
  return exists ? { ...draft, coverKey: key } : draft;
}

/** Whether the draft differs from its initial (or last-saved) state in
 *  any way that would produce a non-empty `images` write. Since a save
 *  is now atomic and either fully lands or fully doesn't, there's no
 *  partial-progress bookkeeping to fold back in — a successful save just
 *  clears the whole draft (see usePropertyDraft/useCreatePropertyDraft),
 *  so `slot.image` here always reflects the true original snapshot. */
export function hasImageChanges(draft: ImageDraft): boolean {
  for (const slot of draft.slots) {
    if (slot.kind === "new") return true;
    if (slot.removed) return true;
    if (slot.alt.trim() !== (slot.image.alt ?? "")) return true;
    if (slot.image.isCover !== (slot.key === draft.coverKey)) return true;
  }
  return false;
}

/** `file`/`purpose`/`alt` for the caller to POST to /admin/media/upload
 *  ahead of the property write — property photos always use the "cover"
 *  purpose (the width ladder tuned for gallery/detail images; "hero" and
 *  "icon" are for other surfaces, and only "icon" accepts SVG). */
export function buildMediaUploadFormData(file: File, alt: string): FormData {
  const formData = new FormData();
  formData.set("file", file);
  formData.set("purpose", "cover");
  if (alt) formData.set("alt", alt);
  return formData;
}

/**
 * Maps the draft's visible slots to the complete desired-state array the
 * atomic PATCH expects. `mediaIdByKey` supplies the mediaAssetId for
 * every "new" slot — the caller must have already uploaded those files
 * (via buildMediaUploadFormData + POST /admin/media/upload) and built
 * this map before calling here; a "new" slot with no entry is a caller
 * bug, not a state this function tries to paper over.
 *
 * alt is a full replacement, not a diff: the server sets
 * `entry.alt ?? null` per entry, so an entry that omits alt clears it
 * even if the underlying image previously had one. Sending `undefined`
 * here for a blank alt is therefore correct, not merely "no change".
 *
 * An existing image whose id doesn't appear in this array (because its
 * slot was removed) is deleted server-side — there is no separate
 * delete op to build.
 */
export function buildImagesPayload(draft: ImageDraft, mediaIdByKey: Map<string, string>): PropertyImageInputEntry[] {
  return visibleSlots(draft).map((slot, index) => {
    const alt = slot.alt.trim() || undefined;
    const isCover = slot.key === draft.coverKey;

    if (slot.kind === "existing") {
      return { id: slot.image.id, alt, sortOrder: index, isCover };
    }

    const mediaAssetId = mediaIdByKey.get(slot.key);
    if (!mediaAssetId) {
      throw new Error(`Missing uploaded mediaAssetId for staged image "${slot.key}"`);
    }
    return { mediaAssetId, alt, sortOrder: index, isCover };
  });
}
