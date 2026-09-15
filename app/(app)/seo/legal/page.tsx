import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { requireModule } from "@/lib/auth/dal";
import { getLegalPages, LEGAL_PAGE_META } from "@/lib/api/legal";
import type { ApiError } from "@/lib/api/errors";

export const metadata: Metadata = { title: "Halaman Legal — Mandana Admin" };

export default async function LegalPagesListPage() {
  await requireModule("seo");
  const result = await getLegalPages();

  if (!result.ok) {
    return <ErrorPanel message={errorMessage(result.error)} />;
  }

  return (
    <div className="flex flex-col gap-2">
      {result.data.map((page) => {
        const meta = LEGAL_PAGE_META[page.pageKey];
        return (
          <Link
            key={page.pageKey}
            href={`/seo/legal/${page.pageKey}`}
            className="flex items-center justify-between gap-4 rounded-lg border border-border p-4 transition-colors hover:border-primary/40"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-primary">{meta.label}</p>
                <span className="text-xs text-muted-foreground">{meta.path}</span>
              </div>
              <p className="mt-0.5 truncate text-sm text-muted-foreground">{page.title}</p>
            </div>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          </Link>
        );
      })}
    </div>
  );
}

function errorMessage(error: ApiError): string {
  if (error.kind === "network") return "Tidak dapat terhubung ke server.";
  if (error.messages.length > 0) return error.messages.join(" ");
  return "Gagal memuat daftar halaman.";
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
      {message}
    </div>
  );
}
