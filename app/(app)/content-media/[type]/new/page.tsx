import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { listContentBlocks } from "@/lib/api/content-blocks";
import { findTypeBySlug } from "@/lib/content-blocks/types";
import { ContentBlockForm } from "@/components/content-media/content-block-form";

type Params = { type: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { type } = await params;
  const typeDef = findTypeBySlug(type);
  return { title: typeDef ? `${typeDef.label} Baru — Mandana Admin` : "Content Media Management — Mandana Admin" };
}

export default async function NewContentBlockPage({ params }: { params: Promise<Params> }) {
  await getCurrentUser();
  const { type } = await params;
  const typeDef = findTypeBySlug(type);
  if (!typeDef) notFound();

  // New blocks append after the current last row so they land at the end
  // of the carousel/strip by default — reordering is what the list's
  // up/down arrows are for, not this number. A failed list read just
  // falls back to 0 rather than blocking the create form.
  const listResult = await listContentBlocks(typeDef.type);
  const nextSortOrder = listResult.ok ? listResult.data.length : 0;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={`/content-media/${typeDef.slug}`}
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="size-4" />
        Kembali ke daftar {typeDef.label.toLowerCase()}
      </Link>

      <h2 className="text-lg font-semibold text-primary">{typeDef.label} baru</h2>

      <ContentBlockForm mode="create" typeDef={typeDef} nextSortOrder={nextSortOrder} />
    </div>
  );
}
