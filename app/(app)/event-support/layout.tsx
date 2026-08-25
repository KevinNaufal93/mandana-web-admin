import { EventSupportTabs } from "@/components/event-support/event-support-tabs";

/**
 * Fetches nothing — deliberately. A segment's error.tsx renders INSIDE
 * its own layout, so a throwing layout would escape past
 * app/(app)/event-support/error.tsx, and this repo has no root
 * app/(app)/error.tsx to catch it. Keeping this to static heading + tabs
 * + {children} means it cannot throw.
 */
export default function EventSupportLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-primary">Event Support</h1>
        <p className="text-sm text-muted-foreground">
          Kelola kategori dan item sewa venue/perlengkapan acara, serta catat pemesanan dari WhatsApp.
        </p>
      </div>

      <EventSupportTabs />

      {children}
    </div>
  );
}
