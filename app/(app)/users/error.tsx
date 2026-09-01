"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { createLogger } from "@/lib/logger";

const log = createLogger("users");

// unstable_retry over reset: this boundary exists to catch Server
// Component failures thrown by a page's own load*() helper, and reset()
// cannot recover those — it re-renders without re-fetching.
export default function UsersError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    log.error("User Management page crashed", { message: error.message, digest: error.digest });
  }, [error]);

  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-6">
      <p className="text-sm text-destructive">Gagal memuat halaman User Management.</p>
      <Button variant="secondary" onClick={() => unstable_retry()}>
        Coba lagi
      </Button>
    </div>
  );
}
