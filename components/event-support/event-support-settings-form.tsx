"use client";

import { useState, useTransition } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { updateEventSupportSettingsAction } from "@/app/actions/event-support-settings";
import type { AdminEventSupportSettings } from "@/lib/api/event-support-settings";

function Field({
  label,
  htmlFor,
  children,
  hint,
  wide,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
  hint: string;
  /** Moving's settings form is three plain numbers, so its Field caps
   *  width at 14rem; this form's Textarea reads better at the form's full
   *  width. */
  wide?: boolean;
}) {
  return (
    <div>
      <Label htmlFor={htmlFor}>{label}</Label>
      <div className={wide ? "mt-1.5 max-w-md" : "mt-1.5 max-w-56"}>{children}</div>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

/**
 * Same shape as MovingSettingsForm — a bare GET/PATCH singleton, always
 * editable, no view/edit mode toggle: there is nothing to create and
 * nothing to browse.
 *
 * As of the 8-hour-pricing rewrite (2026-09-08) this singleton holds only
 * the Jabodetabek-delivery disclosure — the old hourly/daily threshold,
 * rounding step, minimum-hours default, and over-threshold mode are gone;
 * "8 hours" is a server-side constant now, not a setting. GET can never
 * 404 (EventSupportSettingsService auto-seeds), so every value is always
 * present on load — this form always submits the full set.
 */
export function EventSupportSettingsForm({ settings }: { settings: AdminEventSupportSettings }) {
  const [priceIncludesJabodetabekDelivery, setPriceIncludesJabodetabekDelivery] = useState(
    settings.priceIncludesJabodetabekDelivery,
  );
  const [outsideJabodetabekNote, setOutsideJabodetabekNote] = useState(settings.outsideJabodetabekNote ?? "");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  function markDirty() {
    setSuccess(false);
  }

  function handleSubmit() {
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const result = await updateEventSupportSettingsAction({
        priceIncludesJabodetabekDelivery,
        outsideJabodetabekNote: outsideJabodetabekNote.trim() || null,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess(true);
    });
  }

  return (
    <div className="flex flex-col gap-6 rounded-lg border border-border p-4">
      <div>
        <h2 className="text-sm font-semibold text-primary">Pengaturan Event Support</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Berlaku untuk setiap kutipan (quote) dan pemesanan baru — mengubah nilai di sini tidak mengubah pemesanan
          yang sudah tercatat, karena setiap baris menyimpan angka harganya sendiri saat dibuat.
        </p>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {success && !pending && (
        <p role="status" className="text-sm text-primary">
          Perubahan tersimpan.
        </p>
      )}

      <div className="flex flex-col gap-4">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Ongkir</h3>
        <label className="flex items-center gap-2 text-sm text-primary">
          <input
            type="checkbox"
            className="accent-primary"
            checked={priceIncludesJabodetabekDelivery}
            onChange={(e) => {
              setPriceIncludesJabodetabekDelivery(e.target.checked);
              markDirty();
            }}
            disabled={pending}
          />
          Harga sudah termasuk ongkir Jabodetabek
        </label>
        <Field
          label="Catatan di luar Jabodetabek (opsional)"
          htmlFor="settings-outside-jabodetabek-note"
          hint="Belum otomatis dipicu oleh lokasi acara — isi untuk menyiapkan salinan ini untuk penggunaan mendatang."
          wide
        >
          <Textarea
            id="settings-outside-jabodetabek-note"
            value={outsideJabodetabekNote}
            onChange={(e) => {
              setOutsideJabodetabekNote(e.target.value);
              markDirty();
            }}
            disabled={pending}
          />
        </Field>
      </div>

      <div>
        <Button variant="secondary" onClick={handleSubmit} disabled={pending}>
          {pending ? "Menyimpan…" : "Simpan perubahan"}
        </Button>
      </div>
    </div>
  );
}
