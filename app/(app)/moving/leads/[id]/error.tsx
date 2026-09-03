"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createLogger } from "@/lib/logger";

const log = createLogger("moving-leads");

export default function MovingLeadDetailError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    log.error("Moving lead detail page crashed", { message: error.message, digest: error.digest });
  }, [error]);

  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-6">
      <p className="text-sm text-destructive">Gagal memuat detail lead.</p>
      <div className="flex items-center gap-2">
        <Button variant="secondary" onClick={() => unstable_retry()}>
          Coba lagi
        </Button>
        <Button variant="outlineSecondary" asChild>
          <Link href="/moving/leads">Kembali ke daftar</Link>
        </Button>
      </div>
    </div>
  );
}
