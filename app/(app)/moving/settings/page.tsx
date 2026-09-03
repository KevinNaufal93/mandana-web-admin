import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/dal";
import { getMovingSettings } from "@/lib/api/moving-settings";
import { MovingSettingsForm } from "@/components/moving/moving-settings-form";
import type { ApiError } from "@/lib/api/errors";

export const metadata: Metadata = { title: "Pengaturan Moving Support — Mandana Admin" };

// No loadX()/notFound() helper needed here, unlike every [id]/page.tsx in
// this app: GET /admin/moving/settings auto-seeds server-side and can
// never 404 (MovingSettingsService). On a genuine failure (network, 401,
// 500) this renders the same inline ErrorPanel every list page uses,
// rather than throwing to error.tsx — there's no id-scoped detail route
// to distinguish "this row failed" from "the page failed".
export default async function MovingSettingsPage() {
  await getCurrentUser();
  const result = await getMovingSettings();

  if (!result.ok) {
    return <ErrorPanel message={errorMessage(result.error)} />;
  }

  return <MovingSettingsForm settings={result.data} />;
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
