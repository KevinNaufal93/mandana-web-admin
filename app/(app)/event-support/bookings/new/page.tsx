import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { listEventItems } from "@/lib/api/event-support";
import { getEventSupportSettings } from "@/lib/api/event-support-settings";
import { BookingCreateForm } from "@/components/event-support/booking-create-form";

export const metadata: Metadata = { title: "Pemesanan Baru — Mandana Admin" };

export default async function NewEventBookingPage() {
  await getCurrentUser();
  // Only published items can be booked. No client fetching — the picker
  // gets a server-fetched catalog as props, per this repo's state model.
  // Settings failing to load doesn't block the page — recording the
  // booking matters more than its live estimate preview.
  const [itemsResult, settingsResult] = await Promise.all([
    listEventItems({ page: 1, limit: 100, status: "published" }),
    getEventSupportSettings(),
  ]);
  const items = itemsResult.ok ? itemsResult.data.items : [];
  const truncated = itemsResult.ok && itemsResult.data.meta.total > items.length;
  const settings = settingsResult.ok ? settingsResult.data : null;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/event-support/bookings"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="size-4" />
        Kembali ke daftar pemesanan
      </Link>

      <h2 className="text-lg font-semibold text-primary">Catat pemesanan baru</h2>

      {truncated && (
        <p className="text-sm text-muted-foreground">Menampilkan 100 item terbit pertama.</p>
      )}

      <BookingCreateForm items={items} settings={settings} />
    </div>
  );
}
