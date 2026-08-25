import { cn } from "@/lib/utils";

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-muted", className)} />;
}

export default function PropertyDetailLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <SkeletonBlock className="h-4 w-40" />
        <div className="flex items-start justify-between gap-3">
          <SkeletonBlock className="h-8 w-72" />
          <SkeletonBlock className="h-6 w-32" />
        </div>
      </div>

      {/* Gambar sits full-width above the grid, same as the real page — this
          used to be omitted here, so the skeleton→content swap jumped. */}
      <SkeletonBlock className="aspect-video w-full" />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <SkeletonBlock className="h-40 w-full" />
          <SkeletonBlock className="h-32 w-full" />
        </div>
        <div className="flex flex-col gap-6">
          <SkeletonBlock className="h-40 w-full" />
          <SkeletonBlock className="h-28 w-full" />
          <SkeletonBlock className="h-28 w-full" />
          <SkeletonBlock className="h-20 w-full" />
        </div>
      </div>
    </div>
  );
}
