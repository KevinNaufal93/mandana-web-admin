import "server-only";
import { serverApi, unwrap, unwrapPaginated, type Paginated } from "@/lib/api/server-client";
import type { ApiResult } from "@/lib/api/errors";
import type { NotificationFilter, NotificationSourceModule, NotificationsQuery } from "@/lib/notifications/query";

/**
 * One row per booking created in Moving/Storage/Event Support -- see
 * AdminNotificationDto on the API side. `resolvedAt`/`resolvedStatus` are
 * null while the booking is still pending; `readAt` is global/shared, not
 * per-admin (see the API entity's own doc comment for why).
 */
export interface AdminNotification {
  id: string;
  sourceModule: NotificationSourceModule;
  sourceId: string;
  reference: string;
  customerName: string | null;
  total: number;
  origin: "customer" | "admin";
  readAt: string | null;
  resolvedAt: string | null;
  resolvedStatus: string | null;
  createdAt: string;
}

export interface NotificationSummary {
  unresolvedCount: number;
  unreadCount: number;
}

export interface NotificationStreamTicket {
  ticket: string;
  expiresIn: number;
}

export async function listNotifications(query: NotificationsQuery): Promise<ApiResult<Paginated<AdminNotification>>> {
  const api = await serverApi();
  const result = await api.GET("/admin/notifications", {
    params: {
      query: {
        page: query.page,
        limit: query.limit,
        sourceModule: query.sourceModule,
        filter: query.filter as NotificationFilter,
      },
    },
  });
  return unwrapPaginated<AdminNotification>(result);
}

/** Powers the bell badge -- unresolvedCount never drops just because
 *  something was read (see markAllNotificationsRead below). */
export async function getNotificationSummary(): Promise<ApiResult<NotificationSummary>> {
  const api = await serverApi();
  const result = await api.GET("/admin/notifications/summary");
  return unwrap<NotificationSummary>(result);
}

/** Colours one row read. Never resolves it. */
export async function markNotificationRead(id: string): Promise<ApiResult<void>> {
  const api = await serverApi();
  const result = await api.PATCH("/admin/notifications/{id}/read", { params: { path: { id } } });
  return unwrap<void>(result);
}

/** What opening the bell calls -- colours everything unread, for every
 *  admin (read state is global). unresolvedCount is unaffected. */
export async function markAllNotificationsRead(): Promise<ApiResult<void>> {
  const api = await serverApi();
  const result = await api.PATCH("/admin/notifications/read-all");
  return unwrap<void>(result);
}

/**
 * Mints a 60s single-purpose ticket for the admin SSE stream -- normal
 * Bearer-authenticated POST, called from a Server Action right before the
 * client opens its own EventSource (which cannot send an Authorization
 * header). Never cache/reuse a returned ticket across reconnects.
 */
export async function mintNotificationStreamTicket(): Promise<ApiResult<NotificationStreamTicket>> {
  const api = await serverApi();
  const result = await api.POST("/admin/notifications/stream-ticket");
  return unwrap<NotificationStreamTicket>(result);
}
