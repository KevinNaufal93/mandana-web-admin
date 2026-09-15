import "server-only";
import { cache } from "react";
import { serverApi, unwrap } from "@/lib/api/server-client";
import type { ApiResult } from "@/lib/api/errors";
import type { components } from "@/lib/api/schema";
import type { AdminSeoSettings, AdminPageSeo, SeoPageKey } from "@/lib/seo/shared";

// Re-exported so existing server-side call sites can keep importing types
// from "@/lib/api/seo" — only the runtime SEO_PAGE_META/SEO_PAGE_KEYS
// values moved to lib/seo/shared.ts (client components need those without
// pulling this server-only module in; see that file's header comment).
export type { AdminSeoImage, AdminSeoSettings, AdminPageSeo, SeoPageKey } from "@/lib/seo/shared";
export { SEO_PAGE_KEYS, SEO_PAGE_META } from "@/lib/seo/shared";

/** cache() so a page and any sibling component reading settings this
 *  render share one request — same convention as getMovingSettings. */
export const getSeoSettings = cache(async (): Promise<ApiResult<AdminSeoSettings>> => {
  const api = await serverApi();
  const result = await api.GET("/admin/seo/settings", {});
  return unwrap<AdminSeoSettings>(result);
});

export interface SeoSettingsInput {
  organizationName?: string;
  contactPhone?: string;
  contactEmail?: string;
  streetAddress?: string;
  addressLocality?: string;
  addressRegion?: string;
  postalCode?: string;
  socialLinks?: Record<string, string>;
  googleSiteVerification?: string;
  bingSiteVerification?: string;
  defaultOgMediaAssetId?: string;
}

export async function updateSeoSettings(patch: SeoSettingsInput): Promise<ApiResult<AdminSeoSettings>> {
  const api = await serverApi();
  const result = await api.PATCH("/admin/seo/settings", {
    body: patch as unknown as components["schemas"]["UpdateSeoSettingsDto"],
  });
  return unwrap<AdminSeoSettings>(result);
}

/** All 8 pages, in the same fixed order every time (SeoService.getPages()
 *  returns them in SEO_PAGES' declared order server-side). */
export const getSeoPages = cache(async (): Promise<ApiResult<AdminPageSeo[]>> => {
  const api = await serverApi();
  const result = await api.GET("/admin/seo/pages", {});
  return unwrap<AdminPageSeo[]>(result);
});

export interface PageSeoInput {
  metaTitle?: string;
  metaDescription?: string;
  heading?: string;
  noIndex?: boolean;
  ogMediaAssetId?: string;
}

/** The one 400 this resource has: noIndex:true for pageKey "home" — see
 *  SEO_PAGE_META.canHide and the API's own SeoService.updatePage(). */
export async function updatePageSeo(
  pageKey: SeoPageKey,
  patch: PageSeoInput,
): Promise<ApiResult<AdminPageSeo>> {
  const api = await serverApi();
  const result = await api.PATCH("/admin/seo/pages/{pageKey}", {
    params: { path: { pageKey } },
    body: patch as unknown as components["schemas"]["UpdatePageSeoDto"],
  });
  return unwrap<AdminPageSeo>(result);
}
