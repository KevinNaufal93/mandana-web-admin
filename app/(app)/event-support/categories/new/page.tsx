import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { EventCategoryForm } from "@/components/event-support/event-category-form";

export const metadata: Metadata = { title: "Kategori Baru — Mandana Admin" };

export default async function NewEventCategoryPage() {
  await getCurrentUser();

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/event-support/categories"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="size-4" />
        Kembali ke daftar kategori
      </Link>

      <h2 className="text-lg font-semibold text-primary">Kategori baru</h2>

      <EventCategoryForm mode="create" />
    </div>
  );
}
