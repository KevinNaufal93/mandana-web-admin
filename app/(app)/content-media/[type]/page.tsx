import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { listContentBlocks } from "@/lib/api/content-blocks";
import { findTypeBySlug } from "@/lib/content-blocks/types";
import { ContentBlockList } from "@/components/content-media/content-block-list";
import { Button } from "@/components/ui/button";
import type { ApiError } from "@/lib/api/errors";

type Params = { type: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { type } = await params;
  const typeDef = findTypeBySlug(type);
  return { title: typeDef ? `${typeDef.label} — Mandana Admin` : "Content Media Management — Mandana Admin" };
}

export default async function ContentBlockTypePage({ params }: { params: Promise<Params> }) {
  await getCurrentUser();
  const { type } = await params;
  const typeDef = findTypeBySlug(type);
  if (!typeDef) notFound();

  const result = await listContentBlocks(typeDef.type);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-primary">{typeDef.label}</h2>
          <p className="text-sm text-muted-foreground">{typeDef.description}</p>
        </div>
        <Button variant="secondary" asChild>
          <Link href={`/content-media/${typeDef.slug}/new`}>
            <Plus className="size-4" />
            Tambah {typeDef.label.toLowerCase()}
          </Link>
        </Button>
      </div>

      {!result.ok ? (
        <ErrorPanel message={errorMessage(result.error)} />
      ) : (
        <ContentBlockList typeDef={typeDef} rows={result.data} />
      )}
    </div>
  );
}

function errorMessage(error: ApiError): string {
  if (error.kind === "network") return "Tidak dapat terhubung ke server.";
  if (error.messages.length > 0) return error.messages.join(" ");
  return "Gagal memuat daftar konten.";
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
      {message}
    </div>
  );
}
