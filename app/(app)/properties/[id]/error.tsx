"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createLogger } from "@/lib/logger";

const log = createLogger("properties");

export default function PropertyDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    log.error("Property detail page crashed", { message: error.message, digest: error.digest });
  }, [error]);

  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-6">
      <p className="text-sm text-destructive">Gagal memuat detail properti.</p>
      <div className="flex items-center gap-2">
        <Button variant="secondary" onClick={reset}>
          Coba lagi
        </Button>
        <Button variant="outlineSecondary" asChild>
          <Link href="/properties">Kembali ke daftar</Link>
        </Button>
      </div>
    </div>
  );
}
