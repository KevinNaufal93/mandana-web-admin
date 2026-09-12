"use server";

import { revalidatePath } from "next/cache";
import {
  getArticle,
  createArticle,
  updateArticle,
  deleteArticle,
  getArticleCategory,
  createArticleCategory,
  updateArticleCategory,
  deleteArticleCategory,
  type AdminArticleDetail,
  type AdminArticleCategory,
  type ArticleCreateInput,
  type ArticleUpdateInput,
  type ArticleCategoryInput,
} from "@/lib/api/articles";
import type { ArticleStatus } from "@/lib/articles/query";
import type { ApiError } from "@/lib/api/errors";
import { createLogger } from "@/lib/logger";

const log = createLogger("articles");

/**
 * `error.kind === "conflict"` gets its own copy per call site — a 409 here
 * is a rule the operator can act on, not a fault. Unlike event-support,
 * slugs never collide-409 on this module: resolveUniqueSlug()
 * (mandana-api/src/common/utils/slugify.ts) silently appends "-2", "-3", …
 * instead of rejecting, so create/category writes have no duplicate-slug
 * 409 case to handle — only updateArticleAction (published-slug-change)
 * and deleteArticleCategoryAction (still-in-use) ever see one.
 */
function errorMessage(error: ApiError, copy?: { conflict?: string; fallback?: string }): string {
  if (error.kind === "network") return "Tidak dapat terhubung ke server.";
  if (error.kind === "conflict" && copy?.conflict) return copy.conflict;
  if (error.messages.length > 0) return error.messages.join(" ");
  return copy?.fallback ?? "Gagal menyimpan perubahan.";
}

export type ArticleResult = { ok: true; data: AdminArticleDetail } | { ok: false; error: string; conflict?: true };
export type ArticleCategoryResult =
  | { ok: true; data: AdminArticleCategory }
  | { ok: false; error: string; conflict?: true };

// ─── Articles ───────────────────────────────────────────────────────────

/** Every write endpoint's body shape differs slightly from the canonical
 *  read, so — same rule as app/actions/event-support.ts's refreshedItem()
 *  — every mutation re-reads through the one path that's already correct. */
async function refreshedArticle(id: string): Promise<ArticleResult> {
  const result = await getArticle(id);
  if (!result.ok) return { ok: false, error: errorMessage(result.error) };
  return { ok: true, data: result.data };
}

export async function createArticleAction(input: ArticleCreateInput): Promise<ArticleResult> {
  const result = await createArticle(input);
  if (!result.ok) {
    log.warn("Create article failed", { kind: result.error.kind });
    return {
      ok: false,
      error: errorMessage(result.error, { fallback: "Gagal membuat artikel." }),
      ...(result.error.kind === "conflict" ? { conflict: true as const } : {}),
    };
  }
  revalidatePath("/articles/posts");
  return { ok: true, data: result.data };
}

/** The only 409 this endpoint can return: `slug` changed while the
 *  article's current status is "published" — see
 *  ArticlesService.update()'s wasAlreadyPublished guard. Unpublish
 *  (draft/archive), change the slug, republish. */
export async function updateArticleAction(id: string, patch: ArticleUpdateInput): Promise<ArticleResult> {
  const result = await updateArticle(id, patch);
  if (!result.ok) {
    log.warn("Update article failed", { id, kind: result.error.kind });
    return {
      ok: false,
      error: errorMessage(result.error, {
        conflict:
          "Slug artikel yang sudah terbit tidak dapat diubah. Jadikan draf terlebih dahulu, ubah slug, lalu terbitkan kembali.",
        fallback: "Gagal menyimpan artikel.",
      }),
      ...(result.error.kind === "conflict" ? { conflict: true as const } : {}),
    };
  }
  revalidatePath(`/articles/posts/${id}`);
  revalidatePath("/articles/posts");
  return refreshedArticle(id);
}

/**
 * Publish/archive/draft actions all go through this — same PATCH as
 * updateArticleAction, but a `{ status }`-only body. That's deliberate,
 * not just convenient: ArticlesService.update() only stamps `editedAt`
 * when a non-status field changes on an already-published article, and
 * `editedAt` is what the public site renders as "last updated". Sending
 * status alone keeps a temporary archive/republish cycle from falsely
 * claiming the article was edited. Never sends `slug`, so this can't
 * trigger the published-slug-change 409 either.
 */
export async function updateArticleStatusAction(id: string, status: ArticleStatus): Promise<ArticleResult> {
  const result = await updateArticle(id, { status });
  if (!result.ok) {
    log.warn("Update article status failed", { id, status, kind: result.error.kind });
    return {
      ok: false,
      error: errorMessage(result.error, { fallback: "Gagal mengubah status artikel." }),
      ...(result.error.kind === "conflict" ? { conflict: true as const } : {}),
    };
  }
  revalidatePath(`/articles/posts/${id}`);
  revalidatePath("/articles/posts");
  return refreshedArticle(id);
}

/** No reference guard on the API side — deletion always succeeds, unlike
 *  every other delete action in this app. No conflict branch needed. */
export async function deleteArticleAction(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const result = await deleteArticle(id);
  if (!result.ok) {
    log.warn("Delete article failed", { id, kind: result.error.kind });
    return { ok: false, error: errorMessage(result.error, { fallback: "Gagal menghapus artikel." }) };
  }
  revalidatePath("/articles/posts");
  return { ok: true };
}

// ─── Categories ───────────────────────────────────────────────────────────

async function refreshedCategory(id: string): Promise<ArticleCategoryResult> {
  const result = await getArticleCategory(id);
  if (!result.ok) return { ok: false, error: errorMessage(result.error) };
  return { ok: true, data: result.data };
}

export async function createArticleCategoryAction(input: ArticleCategoryInput): Promise<ArticleCategoryResult> {
  const result = await createArticleCategory(input);
  if (!result.ok) {
    log.warn("Create article category failed", { kind: result.error.kind });
    return { ok: false, error: errorMessage(result.error, { fallback: "Gagal membuat kategori." }) };
  }
  revalidatePath("/articles/categories");
  return { ok: true, data: result.data };
}

export async function updateArticleCategoryAction(
  id: string,
  patch: ArticleCategoryInput,
): Promise<ArticleCategoryResult> {
  const result = await updateArticleCategory(id, patch);
  if (!result.ok) {
    log.warn("Update article category failed", { id, kind: result.error.kind });
    return { ok: false, error: errorMessage(result.error, { fallback: "Gagal menyimpan kategori." }) };
  }
  revalidatePath(`/articles/categories/${id}`);
  revalidatePath("/articles/categories");
  return refreshedCategory(id);
}

export async function deleteArticleCategoryAction(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string; conflict?: true }> {
  const result = await deleteArticleCategory(id);
  if (!result.ok) {
    log.warn("Delete article category failed", { id, kind: result.error.kind });
    // The server message names the article count — genuinely useful, so
    // it's appended rather than replaced.
    const conflictCopy =
      result.error.kind === "conflict" && result.error.messages.length > 0
        ? `Kategori ini masih dipakai oleh artikel dan tidak dapat dihapus. Pindahkan atau hapus artikel tersebut terlebih dahulu. (${result.error.messages.join(" ")})`
        : "Kategori ini masih dipakai oleh artikel dan tidak dapat dihapus. Pindahkan atau hapus artikel tersebut terlebih dahulu.";
    return {
      ok: false,
      error: errorMessage(result.error, { conflict: conflictCopy, fallback: "Gagal menghapus kategori." }),
      ...(result.error.kind === "conflict" ? { conflict: true as const } : {}),
    };
  }
  revalidatePath("/articles/categories");
  return { ok: true };
}
