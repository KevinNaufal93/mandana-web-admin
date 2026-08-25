import { Suspense } from "react";
import { cookies } from "next/headers";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { AppTopbar } from "@/components/shell/app-topbar";
import { SidebarProvider } from "@/components/shell/sidebar-provider";
import { UserMenu, UserMenuSkeleton } from "@/components/shell/user-menu";
import { SIDEBAR_COOKIE, parseSidebarState } from "@/lib/ui/sidebar-cookie";

/**
 * No `await` on the DAL at this level. A top-level await on the session
 * in a layout would hold {children} behind it, and — separately — a
 * layout is the wrong place for the auth check anyway: layouts don't
 * re-render on client-side navigation, so the check wouldn't run on a
 * route change. The session-dependent part is exactly one component
 * (<UserMenu/>), so it goes in Suspense and the rest of the shell streams
 * immediately. proxy.ts covers the request boundary; every page's own
 * getCurrentUser() (see app/(app)/page.tsx) covers the render boundary.
 *
 * `await cookies()` is a different animal from that DAL await: it resolves
 * request-local headers with no network hop, so it doesn't hold up the
 * stream. It does mark this layout dynamic, which costs nothing here —
 * every page under (app) already reads the session and is dynamic anyway.
 *
 * That the layout does NOT re-render on client-side navigation is exactly
 * what makes the sidebar state stick between pages: <SidebarProvider>
 * mounts once and survives every route change beneath it.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const sidebarState = parseSidebarState((await cookies()).get(SIDEBAR_COOKIE)?.value);

  return (
    <SidebarProvider defaultState={sidebarState}>
      <div className="flex min-h-svh">
        <AppSidebar />
        {/* min-w-0 so wide content (data tables) scrolls inside <main>
            instead of pushing the sidebar narrower than its own width. */}
        <div className="flex min-w-0 flex-1 flex-col">
          <AppTopbar>
            <Suspense fallback={<UserMenuSkeleton />}>
              <UserMenu />
            </Suspense>
          </AppTopbar>
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
