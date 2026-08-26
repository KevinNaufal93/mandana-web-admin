import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function StorageBookingNotFound() {
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-border p-6">
      <h1 className="text-lg font-semibold text-primary">Pemesanan tidak ditemukan</h1>
      <p className="text-sm text-muted-foreground">Pemesanan ini mungkin tidak ada, atau tautannya tidak valid.</p>
      <Button asChild variant="secondary">
        <Link href="/storage/bookings">Kembali ke daftar pemesanan</Link>
      </Button>
    </div>
  );
}
