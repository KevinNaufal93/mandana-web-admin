import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function StorageInventoryNotFound() {
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-border p-6">
      <h1 className="text-lg font-semibold text-primary">Inventaris tidak ditemukan</h1>
      <p className="text-sm text-muted-foreground">Baris ini mungkin sudah dihapus, atau tautannya tidak valid.</p>
      <Button asChild variant="secondary">
        <Link href="/storage/inventory">Kembali ke daftar inventaris</Link>
      </Button>
    </div>
  );
}
