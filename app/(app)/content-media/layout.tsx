import { ContentMediaTabs } from "@/components/content-media/content-media-tabs";
import { ContentMediaRefreshButton } from "@/components/content-media/content-media-refresh-button";

/**
 * Fetches nothing — deliberately, same no-throw rationale as
 * app/(app)/storage/layout.tsx: a segment's error.tsx renders INSIDE its
 * own layout, so a throwing layout would escape past
 * app/(app)/content-media/error.tsx, and this repo has no root
 * app/(app)/error.tsx to catch it. Tabs come from the static type
 * registry (lib/content-blocks/types.ts), so this needs no data either.
 */
export default function ContentMediaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Content Media Management</h1>
          <p className="text-sm text-muted-foreground">
            Kelola gambar dan konten yang dikelola admin — hero carousel, kartu layanan, dan promo halaman properti.
          </p>
        </div>
        <ContentMediaRefreshButton />
      </div>

      <ContentMediaTabs />

      {children}
    </div>
  );
}
