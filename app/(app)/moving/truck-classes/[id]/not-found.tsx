import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function MovingTruckClassNotFound() {
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-border p-6">
      <h1 className="text-lg font-semibold text-primary">Tipe truk tidak ditemukan</h1>
      <p className="text-sm text-muted-foreground">Tipe truk ini mungkin sudah dihapus, atau tautannya tidak valid.</p>
      <Button asChild variant="secondary">
        <Link href="/moving/truck-classes">Kembali ke daftar tipe truk</Link>
      </Button>
    </div>
  );
}
