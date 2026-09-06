"use client";

import { useState, useTransition } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BookingExportResult } from "@/app/actions/booking-exports";

/**
 * Shared "Ekspor CSV" button for all three pemesanan list screens. The
 * action is passed in as a prop rather than imported here — a Server
 * Action is valid to pass Server → Client as a prop (Next.js docs,
 * mutating-data.md), so each page hands this its own
 * exportXBookingsAction while this component stays module-agnostic.
 *
 * `searchString` is the page's current "?..." query string (built with
 * the same toXBookingSearchString the filter bar already uses) — sent to
 * the action verbatim so the exported rows always match what's on screen.
 *
 * There is no toast system anywhere in this app — failure is an inline
 * `role="alert"` line under the button, matching every other action in
 * this codebase; success needs no banner, the browser's own download is
 * the signal.
 */
export function ExportBookingsButton({
  action,
  searchString,
}: {
  action: (searchString: string) => Promise<BookingExportResult>;
  searchString: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleExport() {
    setError(null);
    startTransition(async () => {
      const result = await action(searchString);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      downloadCsv(result.data.csv, result.data.filename);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <Button variant="outlineSecondary" onClick={handleExport} disabled={pending}>
        <Download className="size-4" />
        {pending ? "Mengekspor…" : "Ekspor CSV"}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/** Nothing in this repo downloads a file today — this is the one new
 *  pattern the feature needs. Blob + object URL + a synthetic, immediately
 *  revoked `<a download>` click is the standard client-side approach for
 *  triggering a save from in-memory string data. */
function downloadCsv(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
