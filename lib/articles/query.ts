/**
 * Query vocabulary for the admin articles list. Not a booking list (no
 * date-range/sort fields) and not modeled on lib/event-support/query.ts's
 * split — QueryAdminArticlesDto extends the bare PaginationQueryDto plus
 * status/categoryId/search, nothing else (see
 * mandana-api/src/modules/articles/dto/query-admin-articles.dto.ts).
 *
 * Article categories have no admin-side filters at all —
 * ArticleCategoriesAdminController.findAll() takes no @Query() — so unlike
 * event-support there is no sibling EventCategoryQuery-equivalent here.
 */
import { first, UUID_RE, type RawSearchParams } from "@/lib/bookings/query";

export const ARTICLE_STATUSES = ["draft", "published", "archived"] as const;
export type ArticleStatus = (typeof ARTICLE_STATUSES)[number];

export interface ArticleQuery {
  page: number;
  limit: number;
  status?: ArticleStatus;
  categoryId?: string;
  search?: string;
}

const DEFAULT_PAGE = 1;
// Admin articles extend the bare PaginationQueryDto (default limit 12) —
// NOT the public /articles endpoint's limit=9 (tuned for mandana-web's
// 3x3 grid). Getting this wrong would silently emit `limit=12` into every
// admin URL once toArticleSearchString "drops the default".
const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 100;

export function parseArticleQuery(raw: RawSearchParams): ArticleQuery {
  const pageRaw = Number(first(raw.page));
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : DEFAULT_PAGE;

  const limitRaw = Number(first(raw.limit));
  const limit = Number.isFinite(limitRaw) && limitRaw >= 1 ? Math.min(Math.floor(limitRaw), MAX_LIMIT) : DEFAULT_LIMIT;

  const statusRaw = first(raw.status);
  const status = (ARTICLE_STATUSES as readonly string[]).includes(statusRaw ?? "")
    ? (statusRaw as ArticleStatus)
    : undefined;

  const categoryIdRaw = first(raw.categoryId);
  const categoryId = categoryIdRaw && UUID_RE.test(categoryIdRaw) ? categoryIdRaw : undefined;

  const searchRaw = first(raw.search)?.trim();
  const search = searchRaw ? searchRaw : undefined;

  return { page, limit, status, categoryId, search };
}

/**
 * Builds a "?..." query string from the current filters plus a patch,
 * dropping default/empty values. Used by the filter bar and pagination
 * links so navigating never drops the other active filters.
 */
export function toArticleSearchString(query: ArticleQuery, patch: Partial<ArticleQuery>): string {
  const merged = { ...query, ...patch };
  const params = new URLSearchParams();
  if (merged.page && merged.page !== DEFAULT_PAGE) params.set("page", String(merged.page));
  if (merged.limit && merged.limit !== DEFAULT_LIMIT) params.set("limit", String(merged.limit));
  if (merged.status) params.set("status", merged.status);
  if (merged.categoryId) params.set("categoryId", merged.categoryId);
  if (merged.search) params.set("search", merged.search);
  const s = params.toString();
  return s ? `?${s}` : "";
}
