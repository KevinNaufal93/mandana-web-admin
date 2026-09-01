"use server";

import { revalidatePath } from "next/cache";
import {
  listContentBlocks,
  createContentBlock,
  updateContentBlock,
  deleteContentBlock,
  type AdminContentBlock,
  type ContentBlockInput,
} from "@/lib/api/content-blocks";
import { findTypeByValue } from "@/lib/content-blocks/types";
import type { ApiError } from "@/lib/api/errors";
import { createLogger } from "@/lib/logger";

const log = createLogger("content-blocks");

/** Copy of app/actions/storage.ts's errorMessage() — see that file's
 *  header comment for why `conflict` gets its own copy per call site
 *  rather than the server's raw English text. Content-blocks has no
 *  documented 409 case today, so no call site below passes a `conflict`
 *  override; kept for shape-consistency with every other actions file
 *  and in case the API adds one later. */
function errorMessage(error: ApiError, copy?: { conflict?: string; fallback?: string }): string {
  if (error.kind === "network") return "Tidak dapat terhubung ke server.";
  if (error.kind === "conflict" && copy?.conflict) return copy.conflict;
  if (error.messages.length > 0) return error.messages.join(" ");
  return copy?.fallback ?? "Gagal menyimpan perubahan.";
}

/** Falls back to the raw API value for a type the registry doesn't know
 *  about yet — see AdminContentBlock.type's doc comment. */
function slugFor(type: string): string {
  return findTypeByValue(type)?.slug ?? type;
}

export type ContentBlockResult =
  | { ok: true; data: AdminContentBlock }
  | { ok: false; error: string; conflict?: true };

export type CreateContentBlockInput = ContentBlockInput & { type: "hero" | "service_card"; title: string };

// ─── Create / update / delete ──────────────────────────────────────────────

export async function createContentBlockAction(input: CreateContentBlockInput): Promise<ContentBlockResult> {
  const result = await createContentBlock(input);
  if (!result.ok) {
    log.warn("Create content block failed", { type: input.type, kind: result.error.kind });
    return {
      ok: false,
      error: errorMessage(result.error, { fallback: "Gagal membuat blok konten." }),
      ...(result.error.kind === "conflict" ? { conflict: true as const } : {}),
    };
  }
  revalidatePath(`/content-media/${slugFor(result.data.type)}`);
  return { ok: true, data: result.data };
}

/**
 * There is no GET /admin/content-blocks/:id to re-read through after a
 * write (see lib/api/content-blocks.ts's getContentBlock() doc comment) —
 * unlike every other module's action file, this one returns the
 * POST/PATCH response directly, which is already the full read shape
 * (image included) per the integration doc §5.
 */
export async function updateContentBlockAction(id: string, patch: ContentBlockInput): Promise<ContentBlockResult> {
  const result = await updateContentBlock(id, patch);
  if (!result.ok) {
    log.warn("Update content block failed", { id, kind: result.error.kind });
    return {
      ok: false,
      error: errorMessage(result.error, { fallback: "Gagal menyimpan blok konten." }),
      ...(result.error.kind === "conflict" ? { conflict: true as const } : {}),
    };
  }
  const slug = slugFor(result.data.type);
  revalidatePath(`/content-media/${slug}/${id}`);
  revalidatePath(`/content-media/${slug}`);
  return { ok: true, data: result.data };
}

/** One-click publish/unpublish from the list — same endpoint as a normal
 *  edit, just a single-field patch. */
export async function toggleContentBlockActiveAction(id: string, isActive: boolean): Promise<ContentBlockResult> {
  return updateContentBlockAction(id, { isActive });
}

export async function deleteContentBlockAction(
  id: string,
  type: "hero" | "service_card",
): Promise<{ ok: true } | { ok: false; error: string }> {
  const result = await deleteContentBlock(id);
  if (!result.ok) {
    log.warn("Delete content block failed", { id, kind: result.error.kind });
    return { ok: false, error: errorMessage(result.error, { fallback: "Gagal menghapus blok konten." }) };
  }
  revalidatePath(`/content-media/${slugFor(type)}`);
  return { ok: true };
}

// ─── Reorder ────────────────────────────────────────────────────────────────

/**
 * No bulk-reorder endpoint exists (integration doc §6) — every row whose
 * sortOrder actually changes needs its own PATCH. A naive "swap the two
 * rows' existing sortOrder values" is a no-op whenever they're tied,
 * which seeded rows commonly are (ties break by createdAt, not a unique
 * sequence) — so this renormalizes sortOrder to the array index across
 * every row, not just the two that moved, and only sends a PATCH for
 * rows whose value actually changes (ordinarily 2; more only on the
 * first move over tied seed data, which self-heals it permanently).
 */
export async function moveContentBlockAction(
  type: "hero" | "service_card",
  id: string,
  direction: "up" | "down",
): Promise<{ ok: true } | { ok: false; error: string }> {
  const listResult = await listContentBlocks(type);
  if (!listResult.ok) {
    log.warn("Move content block failed: could not list", { type, id, kind: listResult.error.kind });
    return { ok: false, error: errorMessage(listResult.error, { fallback: "Gagal memuat urutan blok." }) };
  }

  const rows = listResult.data;
  const index = rows.findIndex((b) => b.id === id);
  if (index === -1) {
    return { ok: false, error: "Blok ini sudah tidak ada. Muat ulang halaman." };
  }

  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= rows.length) return { ok: true }; // already at the edge — no-op

  const reordered = [...rows];
  [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];

  const slug = slugFor(type);
  for (let i = 0; i < reordered.length; i++) {
    const block = reordered[i];
    if (block.sortOrder === i) continue;
    const result = await updateContentBlock(block.id, { sortOrder: i });
    if (!result.ok) {
      log.warn("Move content block failed: patch rejected", { id: block.id, kind: result.error.kind });
      revalidatePath(`/content-media/${slug}`); // reflect whichever patches DID land
      return { ok: false, error: errorMessage(result.error, { fallback: "Gagal menyimpan urutan baru." }) };
    }
  }

  revalidatePath(`/content-media/${slug}`);
  return { ok: true };
}
