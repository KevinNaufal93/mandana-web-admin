import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireModule } from "@/lib/auth/dal";
import { ArticleCategoryForm } from "@/components/articles/article-category-form";

export const metadata: Metadata = { title: "Kategori Baru — Mandana Admin" };

export default async function NewArticleCategoryPage() {
  await requireModule("articles");

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/articles/categories"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="size-4" />
        Kembali ke daftar kategori
      </Link>

      <h2 className="text-lg font-semibold text-primary">Kategori baru</h2>

      <ArticleCategoryForm mode="create" />
    </div>
  );
}
