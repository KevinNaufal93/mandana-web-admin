import { cn } from "@/lib/utils";

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-muted", className)} />;
}

export default function ContentBlockDetailLoading() {
  return (
    <div className="flex flex-col gap-6">
      <SkeletonBlock className="h-4 w-40" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <SkeletonBlock className="h-40 w-full" />
          <SkeletonBlock className="h-24 w-full" />
        </div>
        <SkeletonBlock className="aspect-video w-full" />
      </div>
    </div>
  );
}
