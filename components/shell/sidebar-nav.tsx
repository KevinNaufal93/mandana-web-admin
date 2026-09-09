import { getCurrentUser } from "@/lib/auth/dal";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { cn } from "@/lib/utils";

/**
 * The one session-dependent piece of <AppSidebar> — which modules to show
 * links for. Deliberately its own component, rendered inside a <Suspense>
 * in app/(app)/layout.tsx, mirroring <UserMenu>: getCurrentUser() is
 * cache()'d per request, so this shares the exact same GET /auth/me call
 * as <UserMenu> and every page's own guard — no extra request, just one
 * more place awaiting the same promise, which is why the fallback below is
 * rarely visible in practice.
 */
export async function SidebarNav() {
  const user = await getCurrentUser();
  return <AppSidebar modules={user.modules} />;
}

/**
 * Deliberately minimal, same idea as <UserMenuSkeleton>: not a pixel
 * recreation of the real rail (logo, decorative mark, per-link icons and
 * labels), just enough shape — width, background, a few placeholder bars
 * — that nothing shifts once the real nav swaps in. `collapsed` comes from
 * the sidebar-state cookie the layout already reads synchronously, so even
 * this brief fallback renders at the right width instead of flashing
 * expanded and then snapping shut.
 */
export function SidebarNavSkeleton({ collapsed }: { collapsed: boolean }) {
  return (
    <aside
      aria-hidden="true"
      className={cn(
        "hidden shrink-0 flex-col bg-primary transition-[width] duration-slow ease-standard md:flex",
        collapsed ? "w-16" : "w-64",
      )}
    >
      <div className="h-16 shrink-0 border-b border-border-on-dark" />
      <div className={cn("flex flex-col gap-1 py-4", collapsed ? "px-2" : "px-4")}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 rounded-lg bg-card/10" />
        ))}
      </div>
    </aside>
  );
}
