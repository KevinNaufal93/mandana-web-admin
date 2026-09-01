import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { getContentBlock, type AdminContentBlock } from "@/lib/api/content-blocks";
import { findTypeBySlug } from "@/lib/content-blocks/types";
import { ContentBlockForm } from "@/components/content-media/content-block-form";
import type { ApiError } from "@/lib/api/errors";

type Params = { type: string; id: string };

async function loadBlock(id: string): Promise<AdminContentBlock> {
  const result = await getContentBlock(id);
  if (result.ok) return result.data;
  if (result.error.kind === "notFound" || result.error.kind === "validation") notFound();
  throw new Error(errorMessage(result.error));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { id } = await params;
  const result = await getContentBlock(id);
  return { title: result.ok ? `${result.data.title} — Mandana Admin` : "Content Media Management — Mandana Admin" };
}

export default async function ContentBlockDetailPage({ params }: { params: Promise<Params> }) {
  await getCurrentUser();
  const { type, id } = await params;
  const typeDef = findTypeBySlug(type);
  if (!typeDef) notFound();

  const block = await loadBlock(id);
  // A block id visited under the wrong type's tab (e.g. a hero id under
  // /service-cards/) — treat it the same as not found rather than
  // silently rendering a mismatched form.
  if (block.type !== typeDef.type) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={`/content-media/${typeDef.slug}`}
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="size-4" />
        Kembali ke daftar {typeDef.label.toLowerCase()}
      </Link>

      <ContentBlockForm mode="edit" typeDef={typeDef} block={block} />
    </div>
  );
}

function errorMessage(error: ApiError): string {
  if (error.kind === "network") return "Tidak dapat terhubung ke server.";
  if (error.messages.length > 0) return error.messages.join(" ");
  return "Gagal memuat detail blok konten.";
}
