import { cn } from "@/lib/utils";

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-muted", className)} />;
}

export default function PropertySettingsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <SkeletonBlock className="h-8 w-56" />
        <SkeletonBlock className="h-4 w-80" />
      </div>
      <div className="flex flex-col gap-4 rounded-lg border border-border p-4">
        <SkeletonBlock className="h-4 w-64" />
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <SkeletonBlock className="h-4 w-40" />
            <SkeletonBlock className="h-10 w-56" />
          </div>
        ))}
        <SkeletonBlock className="h-10 w-36" />
      </div>
    </div>
  );
}
