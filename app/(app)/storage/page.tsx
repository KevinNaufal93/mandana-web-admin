import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/dal";
import { getStorageAvailability } from "@/lib/api/storage-availability";
import { listStorageUnitTypes } from "@/lib/api/storage";
import { StorageAvailabilityOverview } from "@/components/storage/storage-availability-overview";
import type { ApiError } from "@/lib/api/errors";

export const metadata: Metadata = { title: "Smart Storage — Mandana Admin" };

/**
 * The module's landing page — an occupancy overview rather than a
 * redirect to the first tab (unlike event-support's page.tsx). The public
 * GET /storage/availability endpoint already aggregates
 * available/occupied/maintenance per facility × unit type, which nothing
 * on the admin side computes, so it's real material for a front page
 * instead of an empty list.
 */
export default async function StorageOverviewPage() {
  await getCurrentUser();

  const [availabilityResult, unitTypesResult] = await Promise.all([getStorageAvailability(), listStorageUnitTypes()]);

  if (!availabilityResult.ok) {
    return <ErrorPanel message={errorMessage(availabilityResult.error)} />;
  }

  return (
    <StorageAvailabilityOverview
      facilities={availabilityResult.data.facilities}
      unitTypes={unitTypesResult.ok ? unitTypesResult.data : []}
    />
  );
}

function errorMessage(error: ApiError): string {
  if (error.kind === "network") return "Tidak dapat terhubung ke server.";
  if (error.messages.length > 0) return error.messages.join(" ");
  return "Gagal memuat ketersediaan.";
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
      {message}
    </div>
  );
}
