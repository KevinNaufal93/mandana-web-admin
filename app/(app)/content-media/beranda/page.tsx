import type { Metadata } from "next";
import { requireModule } from "@/lib/auth/dal";
import { listPageImages } from "@/lib/api/page-images";
import { findPageImagePageBySlug } from "@/lib/page-images/shared";
import { PageImagesForm } from "@/components/content-media/page-images-form";
import type { ApiError } from "@/lib/api/errors";

export const metadata: Metadata = { title: "Beranda — Mandana Admin" };

export default async function BerandaImagesPage() {
  await requireModule("content-media");
  const page = findPageImagePageBySlug("beranda")!;
  const result = await listPageImages();

  if (!result.ok) {
    return <ErrorPanel message={errorMessage(result.error)} />;
  }

  return <PageImagesForm page={page} images={result.data} />;
}

function errorMessage(error: ApiError): string {
  if (error.kind === "network") return "Tidak dapat terhubung ke server.";
  if (error.messages.length > 0) return error.messages.join(" ");
  return "Gagal memuat gambar halaman.";
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
      {message}
    </div>
  );
}
