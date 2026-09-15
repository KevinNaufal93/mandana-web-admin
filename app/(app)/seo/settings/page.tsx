import type { Metadata } from "next";
import { requireModule } from "@/lib/auth/dal";
import { getSeoSettings } from "@/lib/api/seo";
import { SeoSettingsForm } from "@/components/seo/seo-settings-form";
import type { ApiError } from "@/lib/api/errors";

export const metadata: Metadata = { title: "Pengaturan SEO — Mandana Admin" };

// No loadX()/notFound() helper needed, same reasoning as
// app/(app)/moving/settings/page.tsx: GET /admin/seo/settings auto-seeds
// server-side and can never 404.
export default async function SeoSettingsPage() {
  await requireModule("seo");
  const result = await getSeoSettings();

  if (!result.ok) {
    return <ErrorPanel message={errorMessage(result.error)} />;
  }

  return <SeoSettingsForm settings={result.data} />;
}

function errorMessage(error: ApiError): string {
  if (error.kind === "network") return "Tidak dapat terhubung ke server.";
  if (error.messages.length > 0) return error.messages.join(" ");
  return "Gagal memuat pengaturan.";
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
      {message}
    </div>
  );
}
