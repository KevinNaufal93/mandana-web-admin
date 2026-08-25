import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { listEventCategories } from "@/lib/api/event-support";
import { EventItemForm } from "@/components/event-support/event-item-form";

export const metadata: Metadata = { title: "Item Baru — Mandana Admin" };

export default async function NewEventItemPage() {
  await getCurrentUser();
  const categoriesResult = await listEventCategories();
  const categories = categoriesResult.ok ? categoriesResult.data : [];

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/event-support/items"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="size-4" />
        Kembali ke daftar item
      </Link>

      <h2 className="text-lg font-semibold text-primary">Item baru</h2>

      {categories.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Belum ada kategori.{" "}
          <Link href="/event-support/categories/new" className="text-primary underline">
            Buat kategori terlebih dahulu
          </Link>
          .
        </p>
      ) : (
        <EventItemForm mode="create" categories={categories} />
      )}
    </div>
  );
}
