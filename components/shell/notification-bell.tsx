import { Bell } from "lucide-react";
import { listNotifications, getNotificationSummary } from "@/lib/api/notifications";
import { NotificationBellDropdown } from "@/components/shell/notification-bell-dropdown";

/** Matches MAX_DROPDOWN_ITEMS in notification-bell-dropdown.tsx -- the
 *  dropdown's own live SSE updates cap the list at the same size, so the
 *  server-seeded page and the client-maintained one never disagree about
 *  how long the list is meant to be. */
const DROPDOWN_ITEM_LIMIT = 20;

/**
 * The one session-dependent piece feeding the bell -- deliberately kept to
 * this single component and rendered inside a <Suspense> in
 * app/(app)/layout.tsx, mirroring <UserMenu>: a slow fetch streams in
 * without blocking the rest of the topbar.
 *
 * Stays a Server Component for the fetch; all interactivity (the
 * EventSource, the dropdown itself) lives in <NotificationBellDropdown>, a
 * client component that receives this already-fetched state as plain,
 * serializable props.
 */
export async function NotificationBell() {
  const [listResult, summaryResult] = await Promise.all([
    listNotifications({ page: 1, limit: DROPDOWN_ITEM_LIMIT, filter: "all" }),
    getNotificationSummary(),
  ]);

  const initialItems = listResult.ok ? listResult.data.items : [];
  const initialSummary = summaryResult.ok ? summaryResult.data : { unresolvedCount: 0, unreadCount: 0 };

  return <NotificationBellDropdown initialItems={initialItems} initialSummary={initialSummary} />;
}

export function NotificationBellSkeleton() {
  return (
    <div className="flex size-9 items-center justify-center">
      <Bell className="size-5 text-card/40" />
    </div>
  );
}
