import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireModule } from "@/lib/auth/dal";
import { getArticle, listArticleCategories, type AdminArticleDetail } from "@/lib/api/articles";
import { ArticleDetailView } from "@/components/articles/article-detail-view";
import type { ApiError } from "@/lib/api/errors";

type Params = { id: string };

/** notFound() covers both "doesn't exist" and a malformed id
 *  (ParseUUIDPipe 400s) — either way there's no article page to render. */
async function loadArticle(id: string): Promise<AdminArticleDetail> {
  const result = await getArticle(id);
  if (result.ok) return result.data;
  if (result.error.kind === "notFound" || result.error.kind === "validation") notFound();
  throw new Error(errorMessage(result.error));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { id } = await params;
  const result = await getArticle(id);
  return { title: result.ok ? `${result.data.title} — Mandana Admin` : "Artikel — Mandana Admin" };
}

export default async function ArticleDetailPage({ params }: { params: Promise<Params> }) {
  await requireModule("articles");
  const { id } = await params;

  // The article is the page — a failure there 404s/throws. The category
  // list is supporting data for the edit form's dropdown; if it fails to
  // load, the form still renders (just with an empty dropdown) rather
  // than taking the whole page down — same tradeoff
  // EventItemDetailPage makes.
  const [article, categoriesResult] = await Promise.all([loadArticle(id), listArticleCategories()]);

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/articles/posts"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="size-4" />
        Kembali ke daftar artikel
      </Link>

      <ArticleDetailView article={article} categories={categoriesResult.ok ? categoriesResult.data : []} />
    </div>
  );
}

function errorMessage(error: ApiError): string {
  if (error.kind === "network") return "Tidak dapat terhubung ke server.";
  if (error.messages.length > 0) return error.messages.join(" ");
  return "Gagal memuat detail artikel.";
}
