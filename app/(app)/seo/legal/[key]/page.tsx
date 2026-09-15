import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireModule } from "@/lib/auth/dal";
import { getLegalPages, LEGAL_PAGE_META, LEGAL_PAGE_KEYS, type LegalPageKey } from "@/lib/api/legal";
import { LegalPageForm } from "@/components/seo/legal-page-form";
import type { ApiError } from "@/lib/api/errors";

function isLegalPageKey(value: string): value is LegalPageKey {
  return (LEGAL_PAGE_KEYS as readonly string[]).includes(value);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ key: string }>;
}): Promise<Metadata> {
  const { key } = await params;
  if (!isLegalPageKey(key)) return {};
  return { title: `${LEGAL_PAGE_META[key].label} — Mandana Admin` };
}

export default async function LegalPageEditPage({ params }: { params: Promise<{ key: string }> }) {
  await requireModule("seo");
  const { key } = await params;
  if (!isLegalPageKey(key)) notFound();

  // No single-item GET on this resource — 2 rows total, same reasoning as
  // the SEO pages list/edit split.
  const result = await getLegalPages();
  if (!result.ok) {
    return <ErrorPanel message={errorMessage(result.error)} />;
  }

  const page = result.data.find((p) => p.pageKey === key);
  if (!page) notFound();

  const meta = LEGAL_PAGE_META[key];

  return (
    <div className="flex flex-col gap-4">
      <Link href="/seo/legal" className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="size-4" />
        Kembali ke daftar halaman
      </Link>
      <div>
        <h2 className="text-lg font-semibold text-primary">{meta.label}</h2>
        <p className="text-sm text-muted-foreground">{meta.path}</p>
      </div>
      <LegalPageForm pageKey={key} page={page} />
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
