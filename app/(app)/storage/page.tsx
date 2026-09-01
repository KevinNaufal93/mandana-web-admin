import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/dal";
import { getStorageAvailability } from "@/lib/api/storage-availability";
import { listStorageUnitTypes } from "@/lib/api/storage";
import { StorageAvailabilityOverview } from "@/components/storage/storage-availability-overview";
import { StorageRetryPanel } from "@/components/storage/storage-retry-panel";
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
    const { message, transient } = describeError(availabilityResult.error);
    return <StorageRetryPanel message={message} transient={transient} />;
  }

  return (
    <StorageAvailabilityOverview
      facilities={availabilityResult.data.facilities}
      unitTypes={unitTypesResult.ok ? unitTypesResult.data : []}
    />
  );
}

/**
 * `transient` flags failures a retry can plausibly fix on its own — a
 * dropped connection, or the API's single dev-box origin (see
 * mandana-api/docs/deployment.md §8 — a manually stopped/started EC2
 * instance with no auto-healing) answering with a gateway error while it
 * restarts or recovers. A 4xx (bad auth, bad request) won't change on
 * retry, so it's shown without the "try again shortly" hint.
 */
function describeError(error: ApiError): { message: string; transient: boolean } {
  if (error.kind === "network") {
    return { message: "Tidak dapat terhubung ke server.", transient: true };
  }
  if (error.kind === "server" && [502, 503, 504].includes(error.status)) {
    const detail = error.messages.length > 0 ? error.messages.join(" ") : "Server sedang tidak merespons.";
    return { message: detail, transient: true };
  }
  if (error.messages.length > 0) {
    return { message: error.messages.join(" "), transient: false };
  }
  return { message: "Gagal memuat ketersediaan.", transient: false };
}
