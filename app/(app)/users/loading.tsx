import { cn } from "@/lib/utils";

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-muted", className)} />;
}

export default function UsersLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-2">
          <SkeletonBlock className="h-7 w-48" />
          <SkeletonBlock className="h-4 w-72" />
        </div>
        <SkeletonBlock className="h-10 w-40" />
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <SkeletonBlock className="h-10 w-full rounded-none" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-t border-border px-4 py-3">
            <SkeletonBlock className="h-9 w-9 shrink-0 rounded-full" />
            <SkeletonBlock className="h-4 flex-1" />
            <SkeletonBlock className="h-4 w-20" />
            <SkeletonBlock className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
