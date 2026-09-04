"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
   *  width at 14rem; this form also holds a Select and a Textarea, which
   *  read better at the form's full width. */
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
 * GET can never 404 (EventSupportSettingsService auto-seeds), so every
 * value is always present on load — this form always submits the full set.
 */
export function EventSupportSettingsForm({ settings }: { settings: AdminEventSupportSettings }) {
  const [hourlyThresholdHours, setHourlyThresholdHours] = useState(String(settings.hourlyThresholdHours));
  const [hourlyThresholdInclusive, setHourlyThresholdInclusive] = useState(settings.hourlyThresholdInclusive);
  const [defaultMinimumHours, setDefaultMinimumHours] = useState(String(settings.defaultMinimumHours));
  const [roundingUnitMinutes, setRoundingUnitMinutes] = useState(String(settings.roundingUnitMinutes));
  const [capHourlyAtDailyRate, setCapHourlyAtDailyRate] = useState(settings.capHourlyAtDailyRate);
  const [overThresholdMode, setOverThresholdMode] = useState<"whole_days" | "day_plus_hourly">(settings.overThresholdMode);
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

    const threshold = Number(hourlyThresholdHours);
    if (!Number.isInteger(threshold) || threshold < 1) {
      setError("Batas jam/hari harus berupa bilangan bulat, minimal 1.");
      return;
    }
    const minHours = Number(defaultMinimumHours);
    if (!Number.isInteger(minHours) || minHours < 1) {
      setError("Minimum jam default harus berupa bilangan bulat, minimal 1.");
      return;
    }
    const roundingUnit = Number(roundingUnitMinutes);
    if (!Number.isInteger(roundingUnit) || roundingUnit < 1) {
      setError("Satuan pembulatan harus berupa bilangan bulat (menit), minimal 1.");
      return;
    }

    startTransition(async () => {
      const result = await updateEventSupportSettingsAction({
        hourlyThresholdHours: threshold,
        hourlyThresholdInclusive,
        defaultMinimumHours: minHours,
        roundingUnitMinutes: roundingUnit,
        capHourlyAtDailyRate,
        overThresholdMode,
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
        <h2 className="text-sm font-semibold text-primary">Kebijakan Harga per Jam</h2>
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
        <h3 className="text-sm font-semibold text-primary">Batas jam/hari</h3>
        <Field
          label="Batas jam (§6.1)"
          htmlFor="settings-hourly-threshold-hours"
          hint="Sewa dengan durasi sampai batas ini dihitung per jam; di atasnya dihitung per hari."
        >
          <Input
            id="settings-hourly-threshold-hours"
            type="number"
            min={1}
            step={1}
            value={hourlyThresholdHours}
            onChange={(e) => {
              setHourlyThresholdHours(e.target.value);
              markDirty();
            }}
            disabled={pending}
          />
        </Field>
        <label className="flex items-center gap-2 text-sm text-primary">
          <input
            type="checkbox"
            className="accent-primary"
            checked={hourlyThresholdInclusive}
            onChange={(e) => {
              setHourlyThresholdInclusive(e.target.checked);
              markDirty();
            }}
            disabled={pending}
          />
          Durasi tepat di batas tetap dihitung per jam
        </label>

        <h3 className="mt-2 text-sm font-semibold text-primary">Perhitungan jam</h3>
        <Field
          label="Minimum jam default (§6.3)"
          htmlFor="settings-default-minimum-hours"
          hint="Dipakai saat item tidak mengisi minimum jamnya sendiri."
        >
          <Input
            id="settings-default-minimum-hours"
            type="number"
            min={1}
            step={1}
            value={defaultMinimumHours}
            onChange={(e) => {
              setDefaultMinimumHours(e.target.value);
              markDirty();
            }}
            disabled={pending}
          />
        </Field>
        <Field
          label="Satuan pembulatan (menit) (§6.4)"
          htmlFor="settings-rounding-unit-minutes"
          hint="Jam yang dapat ditagih dibulatkan ke atas ke kelipatan ini."
        >
          <Input
            id="settings-rounding-unit-minutes"
            type="number"
            min={1}
            step={1}
            value={roundingUnitMinutes}
            onChange={(e) => {
              setRoundingUnitMinutes(e.target.value);
              markDirty();
            }}
            disabled={pending}
          />
        </Field>
        <label className="flex items-center gap-2 text-sm text-primary">
          <input
            type="checkbox"
            className="accent-primary"
            checked={capHourlyAtDailyRate}
            onChange={(e) => {
              setCapHourlyAtDailyRate(e.target.checked);
              markDirty();
            }}
            disabled={pending}
          />
          Total per jam tidak boleh melebihi harga per hari (§6.2)
        </label>

        <h3 className="mt-2 text-sm font-semibold text-primary">Di atas batas</h3>
        <Field
          label="Mode perhitungan (§6.5)"
          htmlFor="settings-over-threshold-mode"
          hint="Bagaimana durasi yang tidak habis dibagi hari dihitung setelah melewati batas jam/hari."
          wide
        >
          <Select
            value={overThresholdMode}
            onValueChange={(v) => {
              setOverThresholdMode(v as "whole_days" | "day_plus_hourly");
              markDirty();
            }}
          >
            <SelectTrigger id="settings-over-threshold-mode" className="w-full" disabled={pending}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="whole_days">Dibulatkan ke hari penuh</SelectItem>
              <SelectItem value="day_plus_hourly">Hari penuh + sisa per jam</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <h3 className="mt-2 text-sm font-semibold text-primary">Ongkir</h3>
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
          Harga sudah termasuk ongkir Jabodetabek (§6.6)
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
