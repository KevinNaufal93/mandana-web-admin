import { Bell } from "lucide-react";
import { listNotifications, getNotificationSummary } from "@/lib/api/notifications";
import { NotificationBellDropdown } from "@/components/shell/notification-bell-dropdown";
import { getCurrentUser } from "@/lib/auth/dal";

/** Matches MAX_DROPDOWN_ITEMS in notification-bell-dropdown.tsx -- the
 *  dropdown's own live SSE updates cap the list at the same size, so the
 *  server-seeded page and the client-maintained one never disagree about
 *  how long the list is meant to be. */
const DROPDOWN_ITEM_LIMIT = 20;

/**
 * NEXT_PUBLIC_* vars are inlined into the JS bundle at `next build` time --
 * including in server code, not just the client bundle (Next's own docs:
 * "will no longer respond to changes ... after being built"). On Amplify,
 * that means setting or changing NEXT_PUBLIC_API_BASE_URL in the console
 * has no effect until the next rebuild -- if it was unset (or wrong) at the
 * build currently deployed, the bell's EventSource would silently never
 * connect, forever, with nothing in the console to explain why.
 *
 * API_BASE_URL (no NEXT_PUBLIC_ prefix) is never inlined: Next resolves it
 * from real process.env at request time on the server. Preferring it here,
 * server-side, and passing the result down as a plain prop sidesteps the
 * build-time freeze entirely. Falling back to NEXT_PUBLIC_API_BASE_URL
 * keeps this working with zero config changes anywhere that only ever set
 * the public var (local dev's .env.local, today).
 */
function streamBaseUrl(): string | null {
  return process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? null;
}

/**
 * The one session-dependent piece feeding the bell -- deliberately kept to
 * this single component and rendered inside a <Suspense> in
 * app/(app)/layout.tsx, mirroring <UserMenu>: a slow fetch streams in
 * without blocking the rest of the topbar.
 *
 * Gated on the `notifications` module, not `role === "admin"`:
 * `notifications` is RBAC-grantable like any other module (see the module
 * catalog), and the EventSource's stream ticket is authorized against the
 * live grant too -- JwtNotificationsStreamStrategy on the API side re-checks
 * it per connection, not just at ticket-mint time (see
 * mandana-api/src/modules/auth/strategies/jwt-stream.strategy.ts). This is
 * presentation only, same caveat as visibleNavItems(): the real boundary is
 * that strategy plus requireModule() on the page, not this check.
 * getCurrentUser() is cache()'d, so this costs no extra request beyond what
 * <UserMenu> and the page already pay for.
 *
 * Stays a Server Component for the fetch; all interactivity (the
 * EventSource, the dropdown itself) lives in <NotificationBellDropdown>, a
 * client component that receives this already-fetched state as plain,
 * serializable props.
 */
export async function NotificationBell() {
  const user = await getCurrentUser();
  if (!user.modules.includes("notifications")) return null;

  const [listResult, summaryResult] = await Promise.all([
    listNotifications({ page: 1, limit: DROPDOWN_ITEM_LIMIT, filter: "all" }),
    getNotificationSummary(),
  ]);

  const initialItems = listResult.ok ? listResult.data.items : [];
  const initialSummary = summaryResult.ok ? summaryResult.data : { unresolvedCount: 0, unreadCount: 0 };

  return (
    <NotificationBellDropdown
      initialItems={initialItems}
      initialSummary={initialSummary}
      streamBaseUrl={streamBaseUrl()}
    />
  );
}

export function NotificationBellSkeleton() {
  return (
    <div className="flex size-9 items-center justify-center">
      <Bell className="size-5 text-card/40" />
    </div>
  );
}
