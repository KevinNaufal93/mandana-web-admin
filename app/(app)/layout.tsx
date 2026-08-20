import { Suspense } from "react";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { AppTopbar } from "@/components/shell/app-topbar";
import { UserMenu, UserMenuSkeleton } from "@/components/shell/user-menu";

/**
 * No `await` on the DAL at this level. A top-level await on the session
 * in a layout would hold {children} behind it, and — separately — a
 * layout is the wrong place for the auth check anyway: layouts don't
 * re-render on client-side navigation, so the check wouldn't run on a
 * route change. The session-dependent part is exactly one component
 * (<UserMenu/>), so it goes in Suspense and the rest of the shell streams
 * immediately. proxy.ts covers the request boundary; every page's own
 * getCurrentUser() (see app/(app)/page.tsx) covers the render boundary.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh">
      <AppSidebar />
      <div className="flex flex-1 flex-col">
        <AppTopbar>
          <Suspense fallback={<UserMenuSkeleton />}>
            <UserMenu />
          </Suspense>
        </AppTopbar>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
