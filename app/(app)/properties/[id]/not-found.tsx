import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function PropertyNotFound() {
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-border p-6">
      <h1 className="text-lg font-semibold text-primary">Properti tidak ditemukan</h1>
      <p className="text-sm text-muted-foreground">
        Properti ini mungkin sudah dihapus, atau tautannya tidak valid.
      </p>
      <Button asChild variant="secondary">
        <Link href="/properties">Kembali ke daftar properti</Link>
      </Button>
    </div>
  );
}
