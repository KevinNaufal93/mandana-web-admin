/**
 * Client-safe legal-page types + data — same split as lib/seo/shared.ts,
 * for the same reason: lib/api/legal.ts is `import "server-only"`, so a
 * client component (legal-page-form.tsx) needing LEGAL_PAGE_META's runtime
 * values, not just its types, cannot import it from there.
 */

export const LEGAL_PAGE_KEYS = ["privacy", "terms"] as const;

export type LegalPageKey = (typeof LEGAL_PAGE_KEYS)[number];

export interface AdminLegalPage {
  pageKey: LegalPageKey;
  title: string;
  bodyHtml: string;
  bodyText: string;
  updatedAt: string;
}

export const LEGAL_PAGE_META: Record<LegalPageKey, { label: string; path: string }> = {
  privacy: { label: "Kebijakan Privasi", path: "/privasi" },
  terms: { label: "Syarat & Ketentuan", path: "/syarat" },
};
