import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ArticleNotFound() {
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-border p-6">
      <h1 className="text-lg font-semibold text-primary">Artikel tidak ditemukan</h1>
      <p className="text-sm text-muted-foreground">Artikel ini mungkin sudah dihapus, atau tautannya tidak valid.</p>
      <Button asChild variant="secondary">
        <Link href="/articles/posts">Kembali ke daftar artikel</Link>
      </Button>
    </div>
  );
}
