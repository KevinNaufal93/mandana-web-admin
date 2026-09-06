import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/dal";
import { listNotifications } from "@/lib/api/notifications";
import { parseNotificationsQuery } from "@/lib/notifications/query";
import { NotificationFilters } from "@/components/notifications/notification-filters";
import { NotificationsTable } from "@/components/notifications/notifications-table";
import { NotificationsPagination } from "@/components/notifications/notifications-pagination";
import type { ApiError } from "@/lib/api/errors";

export const metadata: Metadata = { title: "Notifikasi — Mandana Admin" };

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await getCurrentUser();
  const query = parseNotificationsQuery(await searchParams);

  const result = await listNotifications(query);
  const hasActiveFilters = Boolean(query.sourceModule || query.filter !== "all");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <NotificationFilters query={query} />
      </div>

      {!result.ok ? (
        <ErrorPanel message={errorMessage(result.error)} />
      ) : (
        <>
          <NotificationsTable rows={result.data.items} hasActiveFilters={hasActiveFilters} />
          <NotificationsPagination query={query} meta={result.data.meta} basePath="/notifications" />
        </>
      )}
    </div>
  );
}

function errorMessage(error: ApiError): string {
  if (error.kind === "network") return "Tidak dapat terhubung ke server.";
  if (error.messages.length > 0) return error.messages.join(" ");
  return "Gagal memuat daftar notifikasi.";
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
      {message}
    </div>
  );
}
