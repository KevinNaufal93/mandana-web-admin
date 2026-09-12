import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { requireModule } from "@/lib/auth/dal";
import { listArticles, listArticleCategories } from "@/lib/api/articles";
import { parseArticleQuery, toArticleSearchString } from "@/lib/articles/query";
import { ArticleFilters } from "@/components/articles/article-filters";
import { ArticlesTable } from "@/components/articles/articles-table";
import { Pagination } from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import type { ApiError } from "@/lib/api/errors";

export const metadata: Metadata = { title: "Artikel — Mandana Admin" };

export default async function ArticlesPostsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireModule("articles");
  const query = parseArticleQuery(await searchParams);

  // Fired in parallel: the filter dropdown's categories don't depend on
  // the list result, and vice versa.
  const [articlesResult, categoriesResult] = await Promise.all([listArticles(query), listArticleCategories()]);

  const categories = categoriesResult.ok ? categoriesResult.data : [];
  const hasActiveFilters = Boolean(query.categoryId || query.status || query.search);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ArticleFilters query={query} categories={categories} />
        <Button variant="secondary" asChild>
          <Link href="/articles/posts/new">
            <Plus className="size-4" />
            Tambah artikel
          </Link>
        </Button>
      </div>

      {!articlesResult.ok ? (
        <ErrorPanel message={errorMessage(articlesResult.error)} />
      ) : (
        <>
          <ArticlesTable rows={articlesResult.data.items} hasActiveFilters={hasActiveFilters} />
          <Pagination
            meta={articlesResult.data.meta}
            noun="artikel"
            hrefForPage={(page) => `/articles/posts${toArticleSearchString(query, { page })}`}
          />
        </>
      )}
    </div>
  );
}

function errorMessage(error: ApiError): string {
  if (error.kind === "network") return "Tidak dapat terhubung ke server.";
  if (error.messages.length > 0) return error.messages.join(" ");
  return "Gagal memuat daftar artikel.";
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
      {message}
    </div>
  );
}
