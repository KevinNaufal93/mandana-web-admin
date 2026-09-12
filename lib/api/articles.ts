import "server-only";
import { cache } from "react";
import { serverApi, unwrap, unwrapPaginated, type Paginated } from "@/lib/api/server-client";
import type { ApiResult } from "@/lib/api/errors";
import type { components } from "@/lib/api/schema";
import type { ArticleQuery, ArticleStatus } from "@/lib/articles/query";

/**
 * Response types are hand-written rather than aliased straight to
 * components["schemas"][...] — this repo's house convention (see
 * lib/api/properties.ts, lib/api/event-support.ts): it decouples this
 * module from regen timing, and matches that ArticlesAdminController
 * carries no @ApiOkResponse decorators (only the PUBLIC findOne route
 * does — see ArticleDetailResponseDto), so openapi-fetch gives no real
 * response typing here to alias anyway. Every field below is checked
 * against the live DTOs/mapper in
 * mandana-api/src/modules/articles/{article.mapper,articles.service}.ts.
 *
 * Two field names genuinely differ from every other image-bearing module
 * in this app — verified, not a typo:
 *   - write: `coverMediaAssetId`, not `mediaAssetId`
 *   - read:  `coverImage`, not `image`
 * Cover uploads use purpose="hero" (not "cover") — the only purpose that
 * generates AVIF, which is why ArticleImage carries srcsetAvif/placeholder
 * that EventImage does not.
 */

export interface ArticleImage {
  url: string;
  srcset: string;
  srcsetAvif: string;
  placeholder: string | null;
  alt: string | null;
  width: number;
  height: number;
}

export interface ArticleCategoryRef {
  id: string;
  slug: string;
  name: string;
}

export interface ArticleAuthor {
  id: string;
  name: string;
  /** e.g. "Content Editor". Null renders no role line. */
  role: string | null;
  avatar: ArticleImage | null;
}

/** Admin list row — same shape as the public card plus `status`, and
 *  `publishedAt`/`updatedAt` are nullable (a draft has never published;
 *  `updatedAt` is really `editedAt` and stays null until an already-
 *  published article gets a content edit — see article-detail-view's
 *  status actions for why that distinction matters). */
export interface AdminArticleCard {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverImage: ArticleImage | null;
  category: ArticleCategoryRef;
  author: ArticleAuthor;
  status: ArticleStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
  readingMinutes: number;
}

export interface AdminArticleDetail extends AdminArticleCard {
  bodyHtml: string;
  metaTitle: string | null;
  metaDescription: string | null;
}

/** Bare entity — ArticleCategoriesAdminController has no mapper, so this
 *  has no `articleCount` the way AdminEventCategory has `itemCount`. The
 *  categories table ships without a count column; the delete-409 message
 *  names the count when it actually matters. */
export interface AdminArticleCategory {
  id: string;
  slug: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Articles ───────────────────────────────────────────────────────────

export async function listArticles(query: ArticleQuery): Promise<ApiResult<Paginated<AdminArticleCard>>> {
  const api = await serverApi();
  const result = await api.GET("/admin/articles", { params: { query } });
  return unwrapPaginated<AdminArticleCard>(result);
}

/** cache() so generateMetadata() and the page share one request. */
export const getArticle = cache(async (id: string): Promise<ApiResult<AdminArticleDetail>> => {
  const api = await serverApi();
  const result = await api.GET("/admin/articles/{id}", { params: { path: { id } } });
  return unwrap<AdminArticleDetail>(result);
});

export interface ArticleCreateInput {
  categoryId: string;
  title: string;
  /** Plain text, admin-authored — NOT auto-truncated from bodyHtml. Card
   *  summary and meta-description fallback. */
  excerpt: string;
  /** Rich-text HTML, sanitized server-side (figure/figcaption/img
   *  allow-listed for this module — see docs/rich-text-descriptions.md). */
  bodyHtml: string;
  slug?: string;
  /** Defaults to "draft" server-side when omitted. */
  status?: ArticleStatus;
  /** Defaults to the creating admin server-side when omitted — there is
   *  no author picker in this UI (see article-form.tsx). */
  authorId?: string;
  coverMediaAssetId?: string;
  metaTitle?: string;
  metaDescription?: string;
}

/**
 * Every field optional, same shape UpdateArticleDto uses
 * (PartialType(CreateArticleDto)) — including `status`, which
 * updateArticleStatusAction (app/actions/articles.ts) uses on its own,
 * sending only `{ status }` so it never trips the API's isContentChange
 * check that stamps `editedAt`.
 */
export type ArticleUpdateInput = Partial<ArticleCreateInput>;

export async function createArticle(input: ArticleCreateInput): Promise<ApiResult<AdminArticleDetail>> {
  const api = await serverApi();
  const result = await api.POST("/admin/articles", {
    body: input as unknown as components["schemas"]["CreateArticleDto"],
  });
  return unwrap<AdminArticleDetail>(result);
}

/** 409 only when `slug` changes while `status === "published"` — every
 *  other field, including status itself, is always writable (articles
 *  have no draft-only edit lock the way event items do). */
export async function updateArticle(id: string, patch: ArticleUpdateInput): Promise<ApiResult<AdminArticleDetail>> {
  const api = await serverApi();
  const result = await api.PATCH("/admin/articles/{id}", {
    params: { path: { id } },
    body: patch as unknown as components["schemas"]["UpdateArticleDto"],
  });
  return unwrap<AdminArticleDetail>(result);
}

/** No reference guard — ArticlesService.remove() has no precheck, unlike
 *  event items (bookings) or article categories (articles). Deletion
 *  always succeeds. */
export async function deleteArticle(id: string): Promise<ApiResult<void>> {
  const api = await serverApi();
  const result = await api.DELETE("/admin/articles/{id}", { params: { path: { id } } });
  return unwrap<void>(result);
}

// ─── Categories ───────────────────────────────────────────────────────────

/** Unfiltered, no query params — ArticleCategoriesAdminController.findAll()
 *  takes none. Deliberately calling /admin/article-categories, never the
 *  public /article-categories (which only returns categories with >=1
 *  published article — using it here would make a brand-new category
 *  unselectable for the very first article that would qualify it). */
export async function listArticleCategories(): Promise<ApiResult<AdminArticleCategory[]>> {
  const api = await serverApi();
  const result = await api.GET("/admin/article-categories");
  return unwrap<AdminArticleCategory[]>(result);
}

export const getArticleCategory = cache(async (id: string): Promise<ApiResult<AdminArticleCategory>> => {
  const api = await serverApi();
  const result = await api.GET("/admin/article-categories/{id}", { params: { path: { id } } });
  return unwrap<AdminArticleCategory>(result);
});

export interface ArticleCategoryInput {
  name?: string;
  slug?: string;
}

export async function createArticleCategory(input: ArticleCategoryInput): Promise<ApiResult<AdminArticleCategory>> {
  const api = await serverApi();
  const result = await api.POST("/admin/article-categories", {
    body: input as unknown as components["schemas"]["CreateArticleCategoryDto"],
  });
  return unwrap<AdminArticleCategory>(result);
}

export async function updateArticleCategory(
  id: string,
  patch: ArticleCategoryInput,
): Promise<ApiResult<AdminArticleCategory>> {
  const api = await serverApi();
  const result = await api.PATCH("/admin/article-categories/{id}", {
    params: { path: { id } },
    body: patch as unknown as components["schemas"]["UpdateArticleCategoryDto"],
  });
  return unwrap<AdminArticleCategory>(result);
}

/** 409 while the category still has any articles. */
export async function deleteArticleCategory(id: string): Promise<ApiResult<void>> {
  const api = await serverApi();
  const result = await api.DELETE("/admin/article-categories/{id}", { params: { path: { id } } });
  return unwrap<void>(result);
}
