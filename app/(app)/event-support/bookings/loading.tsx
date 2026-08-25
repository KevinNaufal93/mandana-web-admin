import { cn } from "@/lib/utils";

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-muted", className)} />;
}

export default function EventBookingsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <SkeletonBlock className="h-10 w-full sm:w-64" />
          <SkeletonBlock className="h-10 w-40" />
          <SkeletonBlock className="h-10 w-84" />
        </div>
        <SkeletonBlock className="h-10 w-40" />
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <SkeletonBlock className="h-10 w-full rounded-none" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-t border-border px-4 py-3">
            <SkeletonBlock className="h-4 w-24" />
            <SkeletonBlock className="h-4 flex-1" />
            <SkeletonBlock className="h-4 w-20" />
            <SkeletonBlock className="h-4 w-28" />
          </div>
        ))}
      </div>
    </div>
  );
}
