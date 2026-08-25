import type { AdminPropertyImage, AdminPropertyImageUpdateInput } from "@/lib/api/properties";

/**
 * Client-side staging for the property image field — see
 * docs/api-property-images.md for why this exists (the write API has no
 * batch/desired-state endpoint, so a save has to be sequenced as several
 * calls) and for the API change that would let this module go away.
 *
 * Pure and framework-free on purpose: this is the single riskiest piece of
 * the property detail redesign (sequencing real network calls, recovering
 * from a call landing partway through a batch), so it's kept out of React
 * entirely — every function here takes a draft in, returns a new draft out,
 * nothing reaches into state or fires a request. `usePropertyDraft` is the
 * only caller.
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

/** Revokes every "new" slot's object URL — call on cancel and on unmount.
 *  Not needed for slots that got converted to "existing" by commitUpload
 *  (that conversion already revokes the URL it's retiring). */
export function revokeAllPreviewUrls(draft: ImageDraft): void {
  for (const slot of draft.slots) {
    if (slot.kind === "new") URL.revokeObjectURL(slot.previewUrl);
  }
}

/** Slots the UI should actually render — removed-but-not-yet-deleted
 *  existing slots stay in `draft.slots` (planCommit still needs them) but
 *  disappear from view immediately. */
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

/** Called right after `op.key`'s upload succeeds — folds the now-real
 *  server image back into the draft in place, converting that one slot
 *  from "new" to "existing" so a retried save (after a later step in the
 *  same batch fails) won't try to upload it a second time. Revokes the
 *  preview URL, since the slot now has a real, permanent one. */
export function commitUpload(draft: ImageDraft, key: string, serverImage: AdminPropertyImage): ImageDraft {
  return {
    ...draft,
    slots: draft.slots.map((s) => {
      if (s.key !== key || s.kind !== "new") return s;
      URL.revokeObjectURL(s.previewUrl);
      return { key, kind: "existing", image: serverImage, alt: s.alt, removed: false };
    }),
  };
}

/** Called right after `imageId`'s delete succeeds — drops that slot for
 *  good, same reason as commitUpload: a retry must not re-attempt it. */
export function commitDelete(draft: ImageDraft, imageId: string): ImageDraft {
  return { ...draft, slots: draft.slots.filter((s) => !(s.kind === "existing" && s.image.id === imageId)) };
}

/** Called right after `key`'s alt/cover patch succeeds — folds the applied
 *  change back into the slot's stored `.image` snapshot. Without this, a
 *  retry (after a LATER step in the same batch fails) would keep diffing
 *  against the pre-edit-session snapshot and re-send an already-applied
 *  patch — harmless (idempotent) but wasteful, and the kind of drift this
 *  module exists specifically to avoid. */
export function commitExistingPatch(draft: ImageDraft, key: string, patch: AdminPropertyImageUpdateInput): ImageDraft {
  return {
    ...draft,
    slots: draft.slots.map((s) => (s.key === key && s.kind === "existing" ? { ...s, image: { ...s.image, ...patch } } : s)),
  };
}

// ─── Commit planning ────────────────────────────────────────────────────────

export interface ImageUploadOp {
  key: string;
  file: File;
  alt: string;
  isCover: boolean;
  sortOrder: number;
}
export interface ImageExistingPatchOp {
  key: string;
  imageId: string;
  patch: AdminPropertyImageUpdateInput;
}
export interface ImageDeleteOp {
  key: string;
  imageId: string;
}
export interface ImageCommitPlan {
  uploads: ImageUploadOp[];
  existingPatches: ImageExistingPatchOp[];
  deletes: ImageDeleteOp[];
}

export function hasPendingWork(plan: ImageCommitPlan): boolean {
  return plan.uploads.length > 0 || plan.existingPatches.length > 0 || plan.deletes.length > 0;
}

/**
 * Diffs the current draft against the slots as they stood when editing
 * began (or as they stood after the last successful step, on a retry — see
 * commitUpload/commitDelete above) and produces an ordered plan.
 *
 * Order matters and is deliberate: uploads (additive, safe) → patches
 * (modifications to data that already exists) → deletes (destructive, last
 * — see docs/api-property-images.md). Cover changes are folded into
 * existingPatches rather than being a separate step: picking a new cover
 * is "patch the new cover to isCover:true" plus "patch whichever existing
 * image currently has isCover:true — if it isn't the new cover — to
 * false", which is the same shape as any other existing-image patch.
 */
export function planImageCommit(draft: ImageDraft): ImageCommitPlan {
  const visible = visibleSlots(draft);
  const uploads: ImageUploadOp[] = [];
  const existingPatches: ImageExistingPatchOp[] = [];
  const deletes: ImageDeleteOp[] = [];

  let nextSortOrder = draft.slots.filter((s) => s.kind === "existing" && !s.removed).length;

  for (const slot of visible) {
    const isCover = slot.key === draft.coverKey;

    if (slot.kind === "new") {
      uploads.push({ key: slot.key, file: slot.file, alt: slot.alt.trim(), isCover, sortOrder: nextSortOrder });
      nextSortOrder += 1;
      continue;
    }

    const patch: AdminPropertyImageUpdateInput = {};
    const altTrimmed = slot.alt.trim();
    if (altTrimmed !== (slot.image.alt ?? "")) patch.alt = altTrimmed || null;
    // Explicit false, not just "omit" — see docs/api-property-images.md's
    // "cover exclusivity" note on why this doesn't trust the API to unset
    // a previous cover on its own.
    if (slot.image.isCover !== isCover) patch.isCover = isCover;

    if (Object.keys(patch).length > 0) {
      existingPatches.push({ key: slot.key, imageId: slot.image.id, patch });
    }
  }

  for (const slot of draft.slots) {
    if (slot.kind === "existing" && slot.removed) {
      deletes.push({ key: slot.key, imageId: slot.image.id });
    }
  }

  return { uploads, existingPatches, deletes };
}

export function buildUploadFormData(op: ImageUploadOp): FormData {
  const formData = new FormData();
  formData.set("file", op.file);
  if (op.alt) formData.set("alt", op.alt);
  formData.set("sortOrder", String(op.sortOrder));
  formData.set("isCover", String(op.isCover));
  return formData;
}
