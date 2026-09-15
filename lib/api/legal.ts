import "server-only";
import { cache } from "react";
import { serverApi, unwrap } from "@/lib/api/server-client";
import type { ApiResult } from "@/lib/api/errors";
import type { components } from "@/lib/api/schema";
import type { AdminLegalPage, LegalPageKey } from "@/lib/legal/shared";

export type { AdminLegalPage, LegalPageKey } from "@/lib/legal/shared";
export { LEGAL_PAGE_KEYS, LEGAL_PAGE_META } from "@/lib/legal/shared";

/** cache() so a page and any sibling component reading this render share
 *  one request — same convention as getSeoPages. */
export const getLegalPages = cache(async (): Promise<ApiResult<AdminLegalPage[]>> => {
  const api = await serverApi();
  const result = await api.GET("/admin/legal/pages", {});
  return unwrap<AdminLegalPage[]>(result);
});

export interface LegalPageInput {
  title?: string;
  bodyHtml?: string;
}

export async function updateLegalPage(
  pageKey: LegalPageKey,
  patch: LegalPageInput,
): Promise<ApiResult<AdminLegalPage>> {
  const api = await serverApi();
  const result = await api.PATCH("/admin/legal/pages/{pageKey}", {
    params: { path: { pageKey } },
    body: patch as unknown as components["schemas"]["UpdateLegalPageDto"],
  });
  return unwrap<AdminLegalPage>(result);
}
