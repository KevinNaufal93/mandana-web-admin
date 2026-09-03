import { MovingTabs } from "@/components/moving/moving-tabs";

/**
 * Fetches nothing — deliberately, same no-throw rationale as
 * storage/layout.tsx: a segment's error.tsx renders INSIDE its own layout,
 * so a throwing layout would escape past app/(app)/moving/error.tsx, and
 * this repo has no root app/(app)/error.tsx to catch it. Keeping this to
 * static heading + tabs + {children} means it cannot throw.
 */
export default function MovingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-primary">Moving Support</h1>
        <p className="text-sm text-muted-foreground">
          Kelola tipe truk, add-on, pengaturan harga, dan lead dari form kalkulasi Mandana Move.
        </p>
      </div>

      <MovingTabs />

      {children}
    </div>
  );
}
