import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { requireModule } from "@/lib/auth/dal";
import { listArticleCategories } from "@/lib/api/articles";
import { ArticleCategoriesTable } from "@/components/articles/article-categories-table";
import { Button } from "@/components/ui/button";
import type { ApiError } from "@/lib/api/errors";

export const metadata: Metadata = { title: "Kategori Artikel — Mandana Admin" };

// No filters here, unlike Event Support's categories page —
// ArticleCategoriesAdminController.findAll() takes no query params at
// all (see lib/api/articles.ts's listArticleCategories).
export default async function ArticleCategoriesPage() {
  await requireModule("articles");
  const result = await listArticleCategories();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <Button variant="secondary" asChild>
          <Link href="/articles/categories/new">
            <Plus className="size-4" />
            Tambah kategori
          </Link>
        </Button>
      </div>

      {!result.ok ? <ErrorPanel message={errorMessage(result.error)} /> : <ArticleCategoriesTable rows={result.data} />}
    </div>
  );
}

function errorMessage(error: ApiError): string {
  if (error.kind === "network") return "Tidak dapat terhubung ke server.";
  if (error.messages.length > 0) return error.messages.join(" ");
  return "Gagal memuat daftar kategori.";
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
      {message}
    </div>
  );
}
