"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createStorageInventoryAction, updateStorageInventoryAction } from "@/app/actions/storage-inventory";
import type { AdminStorageInventory, StorageInventoryInput } from "@/lib/api/storage-inventory";
import type { AdminStorageFacility, AdminStorageUnitType } from "@/lib/api/storage";

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label htmlFor={htmlFor}>{label}</Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

type StorageInventoryFormProps =
  | { mode: "create"; facilities: AdminStorageFacility[]; unitTypes: AdminStorageUnitType[] }
  | {
      mode: "edit";
      inventory: AdminStorageInventory;
      facilities: AdminStorageFacility[];
      unitTypes: AdminStorageUnitType[];
      onSaved: (fresh: AdminStorageInventory) => void;
      onCancel: () => void;
    };

/** Facility + unit-type selects are fed server-side (both catalogs are
 *  small and always listed in full, same as EventItemForm's category
 *  picker). Few enough fields that this stays a single card, unlike the
 *  two-column layout the other forms use. */
export function StorageInventoryForm(props: StorageInventoryFormProps) {
  const router = useRouter();
  const inventory = props.mode === "edit" ? props.inventory : null;

  const [facilityId, setFacilityId] = useState(inventory?.facilityId ?? props.facilities[0]?.id ?? "");
  const [unitTypeId, setUnitTypeId] = useState(inventory?.unitTypeId ?? props.unitTypes[0]?.id ?? "");
  const [monthlyRateOverride, setMonthlyRateOverride] = useState(
    inventory?.monthlyRateOverride != null ? String(inventory.monthlyRateOverride) : "",
  );
  const [isActive, setIsActive] = useState(inventory?.isActive ?? true);

  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit() {
    setError(null);

    if (!facilityId) {
      setError("Pilih fasilitas terlebih dahulu.");
      return;
    }
    if (!unitTypeId) {
      setError("Pilih tipe unit terlebih dahulu.");
      return;
    }
    let rateOverride: number | undefined;
    if (monthlyRateOverride.trim()) {
      rateOverride = Number(monthlyRateOverride);
      if (!Number.isInteger(rateOverride) || rateOverride < 0) {
        setError("Tarif override harus berupa bilangan bulat (Rupiah), 0 atau lebih.");
        return;
      }
    }

    const input: StorageInventoryInput = {
      facilityId,
      unitTypeId,
      monthlyRateOverride: rateOverride,
      isActive,
    };

    startTransition(async () => {
      if (props.mode === "edit") {
        const result = await updateStorageInventoryAction(props.inventory.id, input);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        props.onSaved(result.data);
        return;
      }
      const result = await createStorageInventoryAction(input);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/storage/inventory/${result.data.id}`);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Fasilitas" htmlFor="inventory-facility">
            <Select value={facilityId} onValueChange={setFacilityId}>
              <SelectTrigger id="inventory-facility" className="w-full" disabled={pending}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {props.facilities.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Tipe unit" htmlFor="inventory-unit-type">
            <Select value={unitTypeId} onValueChange={setUnitTypeId}>
              <SelectTrigger id="inventory-unit-type" className="w-full" disabled={pending}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {props.unitTypes.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <Field label="Tarif override / bulan (Rp, opsional)" htmlFor="inventory-rate-override">
          <Input
            id="inventory-rate-override"
            type="number"
            min={0}
            step={1}
            value={monthlyRateOverride}
            onChange={(e) => setMonthlyRateOverride(e.target.value)}
            placeholder="Kosongkan untuk memakai tarif dasar tipe unit"
            disabled={pending}
          />
        </Field>

        <label className="mt-1 flex items-center gap-2 text-sm text-primary">
          <input
            type="checkbox"
            className="accent-primary"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            disabled={pending}
          />
          Aktif
        </label>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="secondary" onClick={handleSubmit} disabled={pending}>
          {props.mode === "edit" ? (pending ? "Menyimpan…" : "Simpan perubahan") : pending ? "Membuat…" : "Buat inventaris"}
        </Button>
        <Button
          variant="outlineSecondary"
          onClick={() => (props.mode === "edit" ? props.onCancel() : router.push("/storage/inventory"))}
          disabled={pending}
        >
          Batal
        </Button>
      </div>
    </div>
  );
}
