import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { getEventItem, listEventCategories, type AdminEventItem } from "@/lib/api/event-support";
import { EventItemDetailView } from "@/components/event-support/event-item-detail-view";
import type { ApiError } from "@/lib/api/errors";

type Params = { id: string };

/** notFound() covers both "doesn't exist" and a malformed id
 *  (ParseUUIDPipe 400s) — either way there's no item page to render. */
async function loadItem(id: string): Promise<AdminEventItem> {
  const result = await getEventItem(id);
  if (result.ok) return result.data;
  if (result.error.kind === "notFound" || result.error.kind === "validation") notFound();
  throw new Error(errorMessage(result.error));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { id } = await params;
  const result = await getEventItem(id);
  return { title: result.ok ? `${result.data.name} — Mandana Admin` : "Item — Mandana Admin" };
}

export default async function EventItemDetailPage({ params }: { params: Promise<Params> }) {
  await getCurrentUser();
  const { id } = await params;

  // The item is the page — a failure there 404s/throws. The edit form's
  // category picker is supporting data; if it fails to load, the form
  // still renders (with the item's own category held as the only option
  // via the item's categoryName) rather than taking the whole page down.
  const [item, categoriesResult] = await Promise.all([loadItem(id), listEventCategories()]);

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/event-support/items"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="size-4" />
        Kembali ke daftar item
      </Link>

      <EventItemDetailView item={item} categories={categoriesResult.ok ? categoriesResult.data : []} />
    </div>
  );
}

function errorMessage(error: ApiError): string {
  if (error.kind === "network") return "Tidak dapat terhubung ke server.";
  if (error.messages.length > 0) return error.messages.join(" ");
  return "Gagal memuat detail item.";
}
