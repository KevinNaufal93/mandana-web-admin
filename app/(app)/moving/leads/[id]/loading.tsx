import { cn } from "@/lib/utils";

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-muted", className)} />;
}

export default function MovingLeadDetailLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <SkeletonBlock className="h-4 w-40" />
        <div className="flex items-start justify-between gap-3">
          <SkeletonBlock className="h-8 w-56" />
          <SkeletonBlock className="h-6 w-24" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <SkeletonBlock className="h-40 w-full" />
          <SkeletonBlock className="h-48 w-full" />
        </div>
        <div className="flex flex-col gap-6">
          <SkeletonBlock className="h-32 w-full" />
          <SkeletonBlock className="h-24 w-full" />
        </div>
      </div>

      <SkeletonBlock className="h-40 w-full" />
    </div>
  );
}
