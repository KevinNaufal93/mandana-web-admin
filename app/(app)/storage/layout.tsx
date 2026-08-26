import { StorageTabs } from "@/components/storage/storage-tabs";

/**
 * Fetches nothing — deliberately, same no-throw rationale as
 * event-support's layout.tsx: a segment's error.tsx renders INSIDE its own
 * layout, so a throwing layout would escape past app/(app)/storage/error.tsx,
 * and this repo has no root app/(app)/error.tsx to catch it. Keeping this
 * to static heading + tabs + {children} means it cannot throw.
 */
export default function StorageLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-primary">Smart Storage</h1>
        <p className="text-sm text-muted-foreground">
          Kelola fasilitas, tipe unit, inventaris, dan unit sewa penyimpanan, serta pemesanan pelanggan.
        </p>
      </div>

      <StorageTabs />

      {children}
    </div>
  );
}
