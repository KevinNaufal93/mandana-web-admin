"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createLogger } from "@/lib/logger";

const log = createLogger("users");

export default function UserDetailError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    log.error("User detail page crashed", { message: error.message, digest: error.digest });
  }, [error]);

  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-6">
      <p className="text-sm text-destructive">Gagal memuat detail pengguna.</p>
      {/* error.message is whatever loadUser() threw — either a specific
          reason from errorMessage() in page.tsx (e.g. an actual API
          message) or, in production, React's own generic "Server
          Components render" text when the failure happened outside that
          function (a framework-level rejection, a thrown non-Error, etc.).
          Either way it's strictly more than the line above alone, so show
          it instead of only logging it — no more console-diving to find
          out why a page crashed. */}
      {error.message && <p className="text-xs text-muted-foreground">{error.message}</p>}
      <div className="flex items-center gap-2">
        <Button variant="secondary" onClick={() => unstable_retry()}>
          Coba lagi
        </Button>
        <Button variant="outlineSecondary" asChild>
          <Link href="/users">Kembali ke daftar</Link>
        </Button>
      </div>
    </div>
  );
}
