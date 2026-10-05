"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { WhatsappNumberField } from "@/components/settings/whatsapp-number-field";
import { whatsappNumberError } from "@/lib/whatsapp-number";
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

/** Staff may type "0,5" (Indonesian) or "0.5"; both mean 0.5%. Returns null
 *  for anything that is not a plain non-negative number with at most 2
 *  decimals. Copied from property-settings-form.tsx's parseRate (same
 *  "text input, not type=number" reasoning — a number input reports "" for
 *  a comma value in some browsers). */
function parseRate(raw: string): number | null {
  const normalized = raw.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  return Number(normalized);
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
  const [insurancePct, setInsurancePct] = useState(String(settings.insurancePct).replace(".", ","));
  const [whatsappNumber, setWhatsappNumber] = useState(settings.whatsappNumber ?? "");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit() {
    setError(null);
    setSuccess(false);

    const pct = parseRate(insurancePct);
    if (pct === null || pct > 100) {
      setError("Persentase asuransi harus berupa angka 0 sampai 100, maksimal 2 angka di belakang koma (contoh: 0,5).");
      return;
    }
    const waError = whatsappNumberError(whatsappNumber);
    if (waError) {
      setError(waError);
      return;
    }

    startTransition(async () => {
      const result = await updateStorageSettingsAction({
        insurancePct: pct,
        whatsappNumber: whatsappNumber.trim(),
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
          label="Asuransi (% dari nilai barang)"
          htmlFor="settings-insurance-pct"
          hint="Persen dari nilai barang yang dideklarasikan pelanggan saat booking — BUKAN dari harga sewa. 0,5 berarti 0,5%, maksimal 2 angka di belakang koma. 0 menonaktifkan asuransi. Rumus: total = subtotal sewa + (nilai barang × persen ini)."
        >
          <Input
            id="settings-insurance-pct"
            type="text"
            inputMode="decimal"
            value={insurancePct}
            onChange={(e) => {
              setInsurancePct(e.target.value);
              setSuccess(false);
            }}
            disabled={pending}
          />
        </Field>
      </div>

      <div className="flex flex-col gap-4">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Kontak</h3>
        <WhatsappNumberField
          id="settings-whatsapp-number"
          label="Nomor WhatsApp Mandana Space (opsional)"
          hint="Tujuan semua tombol WhatsApp di halaman Mandana Space (termasuk halaman lokasi dan konfirmasi booking). Contoh: +6281234567890. Kosongkan untuk memakai WhatsApp Umum (SEO → Pengaturan Umum)."
          value={whatsappNumber}
          onChange={(v) => {
            setWhatsappNumber(v);
            setSuccess(false);
          }}
          disabled={pending}
        />
      </div>

      <div>
        <Button variant="secondary" onClick={handleSubmit} disabled={pending}>
          {pending ? "Menyimpan…" : "Simpan perubahan"}
        </Button>
      </div>
    </div>
  );
}
