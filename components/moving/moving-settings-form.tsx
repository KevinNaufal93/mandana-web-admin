"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updateMovingSettingsAction } from "@/app/actions/moving-settings";
import type { AdminMovingSettings } from "@/lib/api/moving-settings";

function Field({
  label,
  htmlFor,
  children,
  hint,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
  hint: string;
}) {
  return (
    <div>
      <Label htmlFor={htmlFor}>{label}</Label>
      <div className="mt-1.5 max-w-56">{children}</div>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

/**
 * The one screen in this module with no precedent elsewhere in the app —
 * nothing else is a bare GET/PATCH singleton with no list and no `:id`.
 * Resolved as an always-editable form, no view/edit mode toggle: there is
 * nothing to create and nothing to browse, so a mode union would be
 * ceremony over three number inputs.
 *
 * All three fields are optional on PATCH (send any subset), but since GET
 * can never 404 — MovingSettingsService auto-seeds — every value is always
 * present on load, so this form simply always submits the full set.
 */
export function MovingSettingsForm({ settings }: { settings: AdminMovingSettings }) {
  const [roundToIdr, setRoundToIdr] = useState(String(settings.roundToIdr));
  const [bandPct, setBandPct] = useState(String(settings.bandPct));
  const [defaultIncludedKm, setDefaultIncludedKm] = useState(String(settings.defaultIncludedKm));

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit() {
    setError(null);
    setSuccess(false);

    const round = Number(roundToIdr);
    if (!Number.isInteger(round) || round < 1) {
      setError("Pembulatan harus berupa bilangan bulat (Rupiah), minimal 1.");
      return;
    }
    const band = Number(bandPct);
    if (!Number.isInteger(band) || band < 0) {
      setError("Rentang estimasi harus berupa bilangan bulat 0 atau lebih.");
      return;
    }
    const included = Number(defaultIncludedKm);
    if (!Number.isInteger(included) || included < 0) {
      setError("Included km default harus berupa bilangan bulat 0 atau lebih.");
      return;
    }

    startTransition(async () => {
      const result = await updateMovingSettingsAction({
        roundToIdr: round,
        bandPct: band,
        defaultIncludedKm: included,
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
        <h2 className="text-sm font-semibold text-primary">Pengaturan Harga</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Berlaku untuk semua estimasi baru — mengubah nilai di sini tidak mengubah lead yang sudah masuk, karena
          setiap lead menyimpan angka harganya sendiri saat dibuat.
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
        <Field label="Pembulatan (Rp)" htmlFor="settings-round-to-idr" hint="Total estimasi dibulatkan ke kelipatan ini.">
          <Input
            id="settings-round-to-idr"
            type="number"
            min={1}
            step={1}
            value={roundToIdr}
            onChange={(e) => {
              setRoundToIdr(e.target.value);
              setSuccess(false);
            }}
            disabled={pending}
          />
        </Field>

        <Field
          label="Rentang estimasi (%)"
          htmlFor="settings-band-pct"
          hint="Persen penuh, bukan basis points — 10 berarti ±10%. 0 berarti harga pasti tanpa rentang."
        >
          <Input
            id="settings-band-pct"
            type="number"
            min={0}
            step={1}
            value={bandPct}
            onChange={(e) => {
              setBandPct(e.target.value);
              setSuccess(false);
            }}
            disabled={pending}
          />
        </Field>

        <Field
          label="Included km default"
          htmlFor="settings-default-included-km"
          hint="Dipakai saat tipe truk tidak mengisi km termasuknya sendiri."
        >
          <Input
            id="settings-default-included-km"
            type="number"
            min={0}
            step={1}
            value={defaultIncludedKm}
            onChange={(e) => {
              setDefaultIncludedKm(e.target.value);
              setSuccess(false);
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
