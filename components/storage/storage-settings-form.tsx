"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updateStorageSettingsAction } from "@/app/actions/storage-settings";
import type { AdminStorageSettings } from "@/lib/api/storage-settings";

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
 * Same shape as MovingSettingsForm — a bare GET/PATCH singleton, no
 * view/edit toggle. One field today (insurancePct), but kept as a form
 * rather than an inline control so a second setting slots in without a
 * rewrite, same reasoning as moving-settings-form.tsx.
 *
 * insurancePct is optional on PATCH, but since GET can never 404 —
 * StorageSettingsService auto-seeds — it's always present on load, so this
 * form simply always submits it.
 */
export function StorageSettingsForm({ settings }: { settings: AdminStorageSettings }) {
  const [insurancePct, setInsurancePct] = useState(String(settings.insurancePct));

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit() {
    setError(null);
    setSuccess(false);

    const pct = Number(insurancePct);
    if (!Number.isInteger(pct) || pct < 0 || pct > 100) {
      setError("Persentase asuransi harus berupa bilangan bulat antara 0 dan 100.");
      return;
    }

    startTransition(async () => {
      const result = await updateStorageSettingsAction({ insurancePct: pct });
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
          Berlaku untuk semua estimasi dan booking baru — mengubah nilai di sini tidak mengubah booking yang sudah
          masuk, karena setiap booking menyimpan persentase dan nominal asuransinya sendiri saat dibuat.
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
        <Field
          label="Asuransi (%)"
          htmlFor="settings-insurance-pct"
          hint="Persen penuh, bukan basis points — 20 berarti 20%. 0 menonaktifkan asuransi. Ditambahkan ke total sewa: total = subtotal + (subtotal × persen ini)."
        >
          <Input
            id="settings-insurance-pct"
            type="number"
            min={0}
            max={100}
            step={1}
            value={insurancePct}
            onChange={(e) => {
              setInsurancePct(e.target.value);
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
