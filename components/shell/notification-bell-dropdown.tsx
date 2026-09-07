"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationStatusChip } from "@/components/notifications/notification-status-chip";
import { mintStreamTicketAction, markAllNotificationsReadAction } from "@/app/actions/notifications";
import { sourceModuleBookingHref, SOURCE_MODULE_LABEL } from "@/lib/notifications/source";
import { playNotificationSound, unlockNotificationSound } from "@/lib/notifications/sound";
import type { AdminNotification, NotificationSummary } from "@/lib/api/notifications";
import type { NotificationSourceModule } from "@/lib/notifications/query";
import { formatIDRFull } from "@/lib/format";
import { createLogger } from "@/lib/logger";
import { cn } from "@/lib/utils";

interface NotificationCreatedEvent extends AdminNotification {
  unresolvedCount: number;
  unreadCount: number;
}
interface NotificationResolvedEvent {
  id: string;
  sourceModule: NotificationSourceModule;
  sourceId: string;
  resolvedStatus: string;
  unresolvedCount: number;
}
interface NotificationReadEvent {
  ids: string[];
  unreadCount: number;
}
/** Fired once, immediately, on every connect (first load, error retry,
 *  ticket refresh) -- see the API's NotificationsService.stream() doc
 *  comment for why. */
interface NotificationSnapshotEvent {
  items: AdminNotification[];
  unresolvedCount: number;
  unreadCount: number;
}

const MAX_DROPDOWN_ITEMS = 20;
/** Fixed reconnect delay after a dropped stream -- deliberately not a
 *  countdown/backoff ladder: this is a bell icon, not a mission-critical
 *  channel, and a flat 3s keeps the retry logic simple and readable. */
const RECONNECT_DELAY_MS = 3_000;

const log = createLogger("notification-stream");

interface NotificationBellDropdownProps {
  initialItems: AdminNotification[];
  initialSummary: NotificationSummary;
  /** Resolved server-side by <NotificationBell> (see its streamBaseUrl()) --
   *  never read from process.env directly in this client component. See
   *  that function's doc comment for why: NEXT_PUBLIC_* is inlined at
   *  build time, which previously made a post-deploy env change silently
   *  never take effect. Null means truly unconfigured (no API_BASE_URL and
   *  no NEXT_PUBLIC_API_BASE_URL anywhere) -- the stream stays off and logs
   *  once rather than retrying forever. */
  streamBaseUrl: string | null;
}

/**
 * Owns the EventSource lifecycle -- the first EventSource in this app (see
 * docs/storage-admin-integration-plan.md's deferred-follow-up note on the
 * web-admin side). Tokens are httpOnly cookies here, so this connects
 * DIRECTLY to the API (browser -> CloudFront -> API), authenticated by a
 * short-lived ?ticket= minted through a Server Action, never through this
 * app's own BFF proxy -- a long-lived streaming response would not survive
 * Amplify's Lambda-based SSR function timeout.
 *
 * <NotificationBell> (the server half) seeds `initialItems`/`initialSummary`
 * so the bell is correct before any client JS runs; everything after that
 * comes from the stream (notification.snapshot backfills on every
 * connect -- see NotificationSnapshotEvent above -- so a reconnect never
 * has to fall back to polling or router.refresh() either).
 *
 * The connection is kept open even while the tab is hidden: the whole point
 * of the sound + badge is to alert an admin who is not looking at this tab,
 * so a visibility-based disconnect would silence the one case that matters
 * most. The cost is one open connection per idle admin tab indefinitely.
 */
export function NotificationBellDropdown({ initialItems, initialSummary, streamBaseUrl }: NotificationBellDropdownProps) {
  const [items, setItems] = useState(initialItems);
  const [summary, setSummary] = useState(initialSummary);

  useEffect(() => {
    // Browser autoplay policy blocks audio until the page has seen one real
    // user gesture; after that, it stays unlocked for the rest of the tab's
    // lifetime, so this only needs to fire once. { once: true } removes it
    // after the first hit.
    document.addEventListener("pointerdown", unlockNotificationSound, { once: true });
    document.addEventListener("keydown", unlockNotificationSound, { once: true });
    return () => {
      document.removeEventListener("pointerdown", unlockNotificationSound);
      document.removeEventListener("keydown", unlockNotificationSound);
    };
  }, []);

  useEffect(() => {
    // Plain closure-local state, deliberately NOT refs: a ref is shared
    // across every Strict-Mode double-invocation of this effect in dev,
    // so a ref-based "cancelled" flag gets reset by the second mount
    // before the first (soon-to-be-torn-down) mount's in-flight
    // mintStreamTicketAction() resolves -- that race opened two live
    // EventSource connections in dev, each independently prepending the
    // same notification.created payload, which is what produced React's
    // "two children with the same key" warning during testing. A `let`
    // captured by this specific effect invocation's closure has no such
    // cross-invocation leak: each invocation gets its own.
    let cancelled = false;
    let eventSource: EventSource | null = null;
    // Guards the async gap between "connect() started" and "eventSource
    // is actually assigned" -- without it, two overlapping calls to
    // connect() (e.g. a reconnect timer firing while a prior attempt is
    // still awaiting its ticket) can open two live connections (the same
    // class of race the comment above describes for Strict Mode, but
    // reachable here too, post-mount).
    let connecting = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

    function scheduleReconnect() {
      if (cancelled) return;
      reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS);
    }

    async function connect() {
      if (cancelled || connecting || eventSource) return;
      connecting = true;
      try {
        if (!streamBaseUrl) {
          // Not retried: a missing base URL is a deploy misconfiguration
          // (see notification-bell.tsx's streamBaseUrl()), not a
          // transient failure -- retrying on a timer would just repeat
          // the same no-op forever and bury the real problem.
          log.error("No API base URL resolved -- notification stream disabled");
          return;
        }

        const ticketResult = await mintStreamTicketAction();
        if (cancelled) return;
        if (!ticketResult.ok) {
          log.warn("Mint notification stream ticket failed, retrying", { error: ticketResult.error });
          scheduleReconnect();
          return;
        }

        const es = new EventSource(`${streamBaseUrl}/admin/notifications/stream?ticket=${ticketResult.data.ticket}`);
        eventSource = es;

        // Fired once, immediately, by every connection (first load, error
        // retry, ticket refresh). Replaces state wholesale
        // rather than merging, so it also backfills anything that fired
        // while this tab had no stream open -- events$ on the server is a
        // plain Subject with no replay buffer, so those would otherwise
        // be lost for good. See NotificationsService.stream() on the API.
        es.addEventListener("notification.snapshot", (e: MessageEvent<string>) => {
          const payload = JSON.parse(e.data) as NotificationSnapshotEvent;
          setItems(payload.items.slice(0, MAX_DROPDOWN_ITEMS));
          setSummary({ unresolvedCount: payload.unresolvedCount, unreadCount: payload.unreadCount });
        });

        es.addEventListener("notification.created", (e: MessageEvent<string>) => {
          const payload = JSON.parse(e.data) as NotificationCreatedEvent;
          setItems((prev) => [payload, ...prev].slice(0, MAX_DROPDOWN_ITEMS));
          setSummary({ unresolvedCount: payload.unresolvedCount, unreadCount: payload.unreadCount });
          // Not played for notification.snapshot -- that one backfills
          // history on every (re)connect, including the very first, and
          // would otherwise chime for bookings that arrived before this
          // tab ever opened.
          playNotificationSound();
        });

        es.addEventListener("notification.resolved", (e: MessageEvent<string>) => {
          const payload = JSON.parse(e.data) as NotificationResolvedEvent;
          setItems((prev) =>
            prev.map((n) =>
              n.id === payload.id
                ? { ...n, resolvedAt: new Date().toISOString(), resolvedStatus: payload.resolvedStatus }
                : n,
            ),
          );
          setSummary((prev) => ({ ...prev, unresolvedCount: payload.unresolvedCount }));
        });

        es.addEventListener("notification.read", (e: MessageEvent<string>) => {
          const payload = JSON.parse(e.data) as NotificationReadEvent;
          const ids = new Set(payload.ids);
          setItems((prev) => prev.map((n) => (ids.has(n.id) ? { ...n, readAt: n.readAt ?? new Date().toISOString() } : n)));
          setSummary((prev) => ({ ...prev, unreadCount: payload.unreadCount }));
        });

        // Never rely on the browser's native EventSource retry: it would
        // reopen the SAME url, whose ?ticket= has by then likely expired
        // (60s TTL). Close it and mint a fresh ticket for a brand-new
        // connection instead -- same flow docs/storage-integration.md
        // documents for the sibling Storage admin stream.
        es.onerror = () => {
          es.close();
          eventSource = null;
          log.warn("Notification stream dropped, reconnecting");
          scheduleReconnect();
        };
      } catch (err) {
        // mintStreamTicketAction() or `new EventSource(...)` throwing --
        // rather than resolving to the ok:false path above -- used to
        // leave this effect permanently dead for the rest of the session:
        // nothing ever called es.onerror, so no retry was ever scheduled.
        // Catching here and explicitly retrying closes that gap.
        log.error("Failed to open notification stream, retrying", { error: err });
        scheduleReconnect();
      } finally {
        connecting = false;
      }
    }

    connect();

    return () => {
      cancelled = true;
      clearTimeout(reconnectTimer);
      eventSource?.close();
      eventSource = null;
    };
    // streamBaseUrl is resolved once, server-side, by the parent Server
    // Component (see notification-bell.tsx) -- it cannot change during
    // this component's lifetime, but is listed here (rather than in an
    // empty array) because it genuinely is a value the effect reads.
  }, [streamBaseUrl]);

  function handleOpenChange(open: boolean) {
    if (!open || summary.unreadCount === 0) return;
    // Optimistic: colour every row read immediately rather than waiting on
    // the round trip. The server's own notification.read echo (every open
    // stream gets it, including this one) reconciles shortly after and is
    // a no-op against state that already matches.
    setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    setSummary((prev) => ({ ...prev, unreadCount: 0 }));
    void markAllNotificationsReadAction();
  }

  return (
    <DropdownMenu onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={
            summary.unresolvedCount > 0 ? `Notifikasi, ${summary.unresolvedCount} belum diproses` : "Notifikasi"
          }
          className="group relative flex size-9 items-center justify-center rounded-full transition-colors hover:bg-card/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-card/10"
        >
          <Bell className={cn("size-5", summary.unreadCount > 0 ? "text-card" : "text-card/70")} />
          {summary.unresolvedCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-white">
              {summary.unresolvedCount > 99 ? "99+" : summary.unresolvedCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between px-3 py-2.5">
          <p className="text-sm font-semibold text-primary">Notifikasi</p>
          {summary.unresolvedCount > 0 && (
            <span className="text-xs text-muted-foreground">{summary.unresolvedCount} belum diproses</span>
          )}
        </div>
        <DropdownMenuSeparator className="my-0" />
        <div className="scrollbar-subtle max-h-[28rem] overflow-y-auto p-1">
          {items.length === 0 ? (
            <p className="px-2 py-8 text-center text-sm text-muted-foreground">Belum ada notifikasi.</p>
          ) : (
            items.map((n) => <NotificationRow key={n.id} notification={n} />)
          )}
        </div>
        <DropdownMenuSeparator className="my-0" />
        <DropdownMenuItem asChild className="justify-center py-2.5 font-medium text-primary">
          <Link href="/notifications">Lihat semua</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NotificationRow({ notification }: { notification: AdminNotification }) {
  const isResolved = notification.resolvedAt !== null;
  const isUnread = notification.readAt === null;
  const showDot = isUnread && !isResolved;

  return (
    <DropdownMenuItem asChild className={cn("flex-col items-stretch gap-1 p-2", isResolved && "opacity-60")}>
      <Link href={sourceModuleBookingHref(notification.sourceModule, notification.sourceId)}>
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className={cn("size-1.5 shrink-0 rounded-full", showDot ? "bg-destructive" : "bg-transparent")}
          />
          <span
            className={cn(
              "truncate text-sm",
              !isResolved && isUnread ? "font-semibold text-primary" : "text-muted-foreground",
            )}
          >
            {notification.reference}
          </span>
          <span className="ml-auto shrink-0 text-xs text-muted-foreground">
            {SOURCE_MODULE_LABEL[notification.sourceModule]}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 pl-3.5">
          <span className="truncate text-xs text-muted-foreground">
            {notification.customerName ?? "Tanpa nama"} · {formatIDRFull(notification.total)}
          </span>
          <NotificationStatusChip resolvedStatus={notification.resolvedStatus} />
        </div>
      </Link>
    </DropdownMenuItem>
  );
}
