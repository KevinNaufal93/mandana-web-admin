import { cn } from "@/lib/utils";

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-muted", className)} />;
}

export default function RbacLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <SkeletonBlock className="h-7 w-56" />
        <SkeletonBlock className="h-4 w-80" />
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <SkeletonBlock className="h-10 w-full rounded-none" />
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-t border-border px-4 py-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <SkeletonBlock className="h-4 w-40" />
              <SkeletonBlock className="h-3 w-64" />
            </div>
            <div className="flex w-28 shrink-0 items-center justify-center">
              <SkeletonBlock className="h-4 w-4" />
            </div>
            <div className="flex w-28 shrink-0 items-center justify-center">
              <SkeletonBlock className="h-4 w-4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
