import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { getEventBooking, type AdminEventBooking } from "@/lib/api/event-support-bookings";
import { BookingDetailView } from "@/components/event-support/booking-detail-view";
import type { ApiError } from "@/lib/api/errors";

type Params = { id: string };

async function loadBooking(id: string): Promise<AdminEventBooking> {
  const result = await getEventBooking(id);
  if (result.ok) return result.data;
  if (result.error.kind === "notFound" || result.error.kind === "validation") notFound();
  throw new Error(errorMessage(result.error));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { id } = await params;
  const result = await getEventBooking(id);
  return { title: result.ok ? `${result.data.reference} — Mandana Admin` : "Pemesanan — Mandana Admin" };
}

export default async function EventBookingDetailPage({ params }: { params: Promise<Params> }) {
  await getCurrentUser();
  const { id } = await params;
  const booking = await loadBooking(id);

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/event-support/bookings"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="size-4" />
        Kembali ke daftar pemesanan
      </Link>

      <BookingDetailView booking={booking} />
    </div>
  );
}

function errorMessage(error: ApiError): string {
  if (error.kind === "network") return "Tidak dapat terhubung ke server.";
  if (error.messages.length > 0) return error.messages.join(" ");
  return "Gagal memuat detail pemesanan.";
}
