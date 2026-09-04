import { cn } from "@/lib/utils";

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-muted", className)} />;
}

export default function EventSupportSettingsLoading() {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border p-4">
      <SkeletonBlock className="h-4 w-64" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-1.5">
          <SkeletonBlock className="h-4 w-40" />
          <SkeletonBlock className="h-10 w-56" />
        </div>
      ))}
      <SkeletonBlock className="h-10 w-36" />
    </div>
  );
}
