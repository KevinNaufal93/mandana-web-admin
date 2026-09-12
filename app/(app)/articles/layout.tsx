import { ArticlesTabs } from "@/components/articles/articles-tabs";

/**
 * Fetches nothing — deliberately. A segment's error.tsx renders INSIDE
 * its own layout, so a throwing layout would escape past
 * app/(app)/articles/error.tsx, and this repo has no root
 * app/(app)/error.tsx to catch it. Keeping this to static heading + tabs
 * + {children} means it cannot throw. Copy of
 * app/(app)/event-support/layout.tsx's pattern.
 */
export default function ArticlesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-primary">Article Management</h1>
        <p className="text-sm text-muted-foreground">
          Kelola artikel dan kategori untuk konten SEO yang tampil di /artikel.
        </p>
      </div>

      <ArticlesTabs />

      {children}
    </div>
  );
}
