import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireModule } from "@/lib/auth/dal";
import { getPropertySettings } from "@/lib/api/property-settings";
import { PropertySettingsForm } from "@/components/properties/property-settings-form";
import { Button } from "@/components/ui/button";
import type { ApiError } from "@/lib/api/errors";

export const metadata: Metadata = { title: "Pengaturan KPR — Mandana Admin" };

// Same as app/(app)/storage/settings/page.tsx: GET /admin/property-settings
// auto-seeds server-side and can never 404, so a failure renders the inline
// ErrorPanel rather than throwing to error.tsx. Unlike Moving/Storage/Living
// there is no layout with tabs here (Properties has none), so this page
// carries its own heading and a way back to the list.
export default async function PropertySettingsPage() {
  await requireModule("properties");
  const result = await getPropertySettings();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Pengaturan KPR</h1>
          <p className="text-sm text-muted-foreground">Bunga dan tenor untuk simulasi cicilan di website.</p>
        </div>
        <Button variant="outlineSecondary" asChild>
          <Link href="/properties">
            <ArrowLeft className="size-4" />
            Daftar properti
          </Link>
        </Button>
      </div>

      {result.ok ? <PropertySettingsForm settings={result.data} /> : <ErrorPanel message={errorMessage(result.error)} />}
    </div>
  );
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
