import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function EventCategoryNotFound() {
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-border p-6">
      <h1 className="text-lg font-semibold text-primary">Kategori tidak ditemukan</h1>
      <p className="text-sm text-muted-foreground">Kategori ini mungkin sudah dihapus, atau tautannya tidak valid.</p>
      <Button asChild variant="secondary">
        <Link href="/event-support/categories">Kembali ke daftar kategori</Link>
      </Button>
    </div>
  );
}
