"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updatePropertySettingsAction } from "@/app/actions/property-settings";
import type { AdminPropertySettings } from "@/lib/api/property-settings";

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

/** Staff may type "1,75" (Indonesian) or "1.75"; both mean 1.75%. Returns
 *  null for anything that is not a plain non-negative number with at most
 *  2 decimals. Text input rather than type="number" because a number input
 *  reports "" for a comma value in some browsers, which would read as
 *  "nothing typed". */
function parseRate(raw: string): number | null {
  const normalized = raw.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  return Number(normalized);
}

/**
 * Same shape as StorageSettingsForm: a bare GET/PATCH singleton, always
 * editable, no view/edit toggle. GET can never 404 (PropertySettingsService
 * auto-seeds), so both values are always present on load and this form
 * always submits both.
 */
export function PropertySettingsForm({ settings }: { settings: AdminPropertySettings }) {
  const [rate, setRate] = useState(String(settings.kprAnnualRatePct).replace(".", ","));
  const [tenorYears, setTenorYears] = useState(String(settings.kprTenorYears));

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit() {
    setError(null);
    setSuccess(false);

    const parsedRate = parseRate(rate);
    if (parsedRate === null || parsedRate > 30) {
      setError("Bunga harus berupa angka 0 sampai 30, maksimal 2 angka di belakang koma (contoh: 1,75).");
      return;
    }
    const tenor = Number(tenorYears);
    if (!Number.isInteger(tenor) || tenor < 1 || tenor > 30) {
      setError("Tenor harus berupa bilangan bulat antara 1 dan 30 tahun.");
      return;
    }

    startTransition(async () => {
      const result = await updatePropertySettingsAction({
        kprAnnualRatePct: parsedRate,
        kprTenorYears: tenor,
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
        <h2 className="text-sm font-semibold text-primary">Simulasi Cicilan KPR</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Dipakai simulator cicilan di halaman detail properti yang dijual. Bunga dan tenor ini berlaku untuk semua
          properti; uang muka tetap diatur sendiri oleh pengunjung di simulator.
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
          label="Bunga fix (% per tahun)"
          htmlFor="settings-kpr-rate"
          hint="Persen per tahun — 1,75 berarti 1,75%. Maksimal 2 angka di belakang koma. Tampil di simulator sebagai “Bunga fix …%”."
        >
          <Input
            id="settings-kpr-rate"
            type="text"
            inputMode="decimal"
            value={rate}
            onChange={(e) => {
              setRate(e.target.value);
              setSuccess(false);
            }}
            disabled={pending}
          />
        </Field>

        <Field
          label="Tenor (tahun)"
          htmlFor="settings-kpr-tenor"
          hint="Lama cicilan dalam tahun, bilangan bulat 1–30. Tampil di simulator sebagai “(… Tahun)”."
        >
          <Input
            id="settings-kpr-tenor"
            type="number"
            min={1}
            max={30}
            step={1}
            value={tenorYears}
            onChange={(e) => {
              setTenorYears(e.target.value);
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
