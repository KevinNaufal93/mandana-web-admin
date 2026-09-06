"use client";

import { useState, useTransition } from "react";
import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BookingPdfResult } from "@/app/actions/booking-pdfs";

/**
 * Shared "Unduh PDF" button for all three pemesanan detail screens — the
 * PDF sibling of components/bookings/export-bookings-button.tsx, same
 * shape throughout (action passed in as a prop so this component stays
 * module-agnostic, inline `role="alert"` failure line since this app has
 * no toast system, no success banner because the browser's own download
 * is the signal).
 *
 * The one difference from the CSV button: the Server Action returns a PDF
 * as base64 (bytes can't cross the Server Action boundary as a plain
 * string the way CSV text can), so this decodes it back into a Blob
 * before handing it to the same object-URL/anchor download dance.
 */
export function DownloadBookingPdfButton({
  action,
  bookingId,
}: {
  action: (id: string) => Promise<BookingPdfResult>;
  bookingId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDownload() {
    setError(null);
    startTransition(async () => {
      const result = await action(bookingId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      downloadPdf(result.data.pdfBase64, result.data.filename);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <Button variant="outlineSecondary" onClick={handleDownload} disabled={pending}>
        <FileDown className="size-4" />
        {pending ? "Menyiapkan…" : "Unduh PDF"}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function downloadPdf(pdfBase64: string, filename: string): void {
  const bytes = Uint8Array.from(atob(pdfBase64), (c) => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
