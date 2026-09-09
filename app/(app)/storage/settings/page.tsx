import type { Metadata } from "next";
import { requireModule } from "@/lib/auth/dal";
import { getStorageSettings } from "@/lib/api/storage-settings";
import { StorageSettingsForm } from "@/components/storage/storage-settings-form";
import type { ApiError } from "@/lib/api/errors";

export const metadata: Metadata = { title: "Pengaturan Mandana Space — Mandana Admin" };

// No loadX()/notFound() helper needed here, unlike every [id]/page.tsx in
// this app: GET /admin/storage/settings auto-seeds server-side and can
// never 404 (StorageSettingsService). On a genuine failure (network, 401,
// 500) this renders the same inline ErrorPanel every list page uses,
// rather than throwing to error.tsx — there's no id-scoped detail route
// to distinguish "this row failed" from "the page failed". Mirrors
// app/(app)/moving/settings/page.tsx exactly.
export default async function StorageSettingsPage() {
  await requireModule("storage");
  const result = await getStorageSettings();

  if (!result.ok) {
    return <ErrorPanel message={errorMessage(result.error)} />;
  }

  return <StorageSettingsForm settings={result.data} />;
}

function errorMessage(error: ApiError): string {
  if (error.kind === "network") return "Tidak dapat terhubung ke server.";
  if (error.messages.length > 0) return error.messages.join(" ");
  return "Gagal memuat pengaturan.";
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
      {message}
    </div>
  );
}
