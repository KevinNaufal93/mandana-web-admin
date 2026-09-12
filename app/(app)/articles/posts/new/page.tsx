import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireModule } from "@/lib/auth/dal";
import { listArticleCategories } from "@/lib/api/articles";
import { ArticleForm } from "@/components/articles/article-form";

export const metadata: Metadata = { title: "Artikel Baru — Mandana Admin" };

export default async function NewArticlePage() {
  await requireModule("articles");
  const categoriesResult = await listArticleCategories();
  const categories = categoriesResult.ok ? categoriesResult.data : [];

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/articles/posts"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="size-4" />
        Kembali ke daftar artikel
      </Link>

      <h2 className="text-lg font-semibold text-primary">Artikel baru</h2>

      {categories.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Belum ada kategori.{" "}
          <Link href="/articles/categories/new" className="text-primary underline">
            Buat kategori terlebih dahulu
          </Link>
          .
        </p>
      ) : (
        <ArticleForm mode="create" categories={categories} />
      )}
    </div>
  );
}
