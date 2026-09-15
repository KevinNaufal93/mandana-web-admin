import { SeoTabs } from "@/components/seo/seo-tabs";

/**
 * Fetches nothing — deliberately, same no-throw rationale as
 * app/(app)/content-media/layout.tsx: a segment's error.tsx renders
 * INSIDE its own layout, so a throwing layout would escape past
 * app/(app)/seo/error.tsx (this repo has no root app/(app)/error.tsx to
 * catch it). Tabs are a static list, so this needs no data either.
 */
export default function SeoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-primary">SEO</h1>
        <p className="text-sm text-muted-foreground">
          Judul, deskripsi, dan pengaturan yang menentukan bagaimana situs ini muncul di Google.
        </p>
      </div>

      <SeoTabs />

      {children}
    </div>
  );
}
