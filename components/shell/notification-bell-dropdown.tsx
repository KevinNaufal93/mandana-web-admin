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
import type { AdminNotification, NotificationSummary } from "@/lib/api/notifications";
import type { NotificationSourceModule } from "@/lib/notifications/query";
import { formatIDRFull } from "@/lib/format";
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

const MAX_DROPDOWN_ITEMS = 20;
/** Fixed reconnect delay after a dropped stream -- deliberately not a
 *  countdown/backoff ladder: this is a bell icon, not a mission-critical
 *  channel, and a flat 3s keeps the retry logic simple and readable. */
const RECONNECT_DELAY_MS = 3_000;

interface NotificationBellDropdownProps {
  initialItems: AdminNotification[];
  initialSummary: NotificationSummary;
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
 * comes from the stream, never from polling or router.refresh().
 */
export function NotificationBellDropdown({ initialItems, initialSummary }: NotificationBellDropdownProps) {
  const [items, setItems] = useState(initialItems);
  const [summary, setSummary] = useState(initialSummary);

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
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

    async function connect() {
      const base = process.env.NEXT_PUBLIC_API_BASE_URL;
      if (!base) return;

      const ticketResult = await mintStreamTicketAction();
      if (cancelled || !ticketResult.ok) return;

      const es = new EventSource(`${base}/admin/notifications/stream?ticket=${ticketResult.data.ticket}`);
      eventSource = es;

      es.addEventListener("notification.created", (e: MessageEvent<string>) => {
        const payload = JSON.parse(e.data) as NotificationCreatedEvent;
        setItems((prev) => [payload, ...prev].slice(0, MAX_DROPDOWN_ITEMS));
        setSummary({ unresolvedCount: payload.unresolvedCount, unreadCount: payload.unreadCount });
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
        if (!cancelled) {
          reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS);
        }
      };
    }

    function disconnect() {
      clearTimeout(reconnectTimer);
      eventSource?.close();
      eventSource = null;
    }

    // Background tabs don't hold a connection open -- reconnect (with a
    // fresh ticket) only once this tab is visible again.
    function handleVisibilityChange() {
      if (document.hidden) {
        disconnect();
      } else if (!eventSource) {
        connect();
      }
    }

    if (!document.hidden) connect();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      disconnect();
    };
  }, []);

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
