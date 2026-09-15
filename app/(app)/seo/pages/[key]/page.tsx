import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireModule } from "@/lib/auth/dal";
import { getSeoPages, SEO_PAGE_META, SEO_PAGE_KEYS, type SeoPageKey } from "@/lib/api/seo";
import { PageSeoForm } from "@/components/seo/page-seo-form";
import type { ApiError } from "@/lib/api/errors";

function isSeoPageKey(value: string): value is SeoPageKey {
  return (SEO_PAGE_KEYS as readonly string[]).includes(value);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ key: string }>;
}): Promise<Metadata> {
  const { key } = await params;
  if (!isSeoPageKey(key)) return {};
  return { title: `SEO ${SEO_PAGE_META[key].label} — Mandana Admin` };
}

export default async function SeoPageEditPage({ params }: { params: Promise<{ key: string }> }) {
  await requireModule("seo");
  const { key } = await params;
  if (!isSeoPageKey(key)) notFound();

  // No single-item GET on this resource — 8 rows total, so fetching the
  // list and picking one out is cheap and avoids an admin-only endpoint
  // that would exist purely to save filtering 8 items in memory.
  const result = await getSeoPages();
  if (!result.ok) {
    return <ErrorPanel message={errorMessage(result.error)} />;
  }

  const page = result.data.find((p) => p.pageKey === key);
  if (!page) notFound();

  const meta = SEO_PAGE_META[key];

  return (
    <div className="flex flex-col gap-4">
      <Link href="/seo/pages" className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="size-4" />
        Kembali ke daftar halaman
      </Link>
      <div>
        <h2 className="text-lg font-semibold text-primary">{meta.label}</h2>
        <p className="text-sm text-muted-foreground">{meta.path}</p>
      </div>
      <PageSeoForm pageKey={key} page={page} />
    </div>
  );
}

function errorMessage(error: ApiError): string {
  if (error.kind === "network") return "Tidak dapat terhubung ke server.";
  if (error.messages.length > 0) return error.messages.join(" ");
  return "Gagal memuat halaman.";
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
      {message}
    </div>
  );
}
