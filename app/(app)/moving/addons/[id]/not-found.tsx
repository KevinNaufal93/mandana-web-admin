import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function MovingAddonNotFound() {
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-border p-6">
      <h1 className="text-lg font-semibold text-primary">Add-on tidak ditemukan</h1>
      <p className="text-sm text-muted-foreground">Add-on ini mungkin sudah dihapus, atau tautannya tidak valid.</p>
      <Button asChild variant="secondary">
        <Link href="/moving/addons">Kembali ke daftar add-on</Link>
      </Button>
    </div>
  );
}
