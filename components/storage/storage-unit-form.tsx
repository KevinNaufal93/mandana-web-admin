"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createStorageUnitAction, updateStorageUnitAction } from "@/app/actions/storage-units";
import { STORAGE_UNIT_STATUSES, type StorageUnitStatus } from "@/lib/storage/query";
import type { AdminStorageUnit, StorageUnitInput } from "@/lib/api/storage-units";
import type { AdminStorageFacility, AdminStorageUnitType } from "@/lib/api/storage";

const STATUS_LABEL: Record<StorageUnitStatus, string> = {
  available: "Tersedia",
  occupied: "Terisi",
  maintenance: "Perawatan",
};

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

type StorageUnitFormProps =
  | { mode: "create"; facilities: AdminStorageFacility[]; unitTypes: AdminStorageUnitType[] }
  | {
      mode: "edit";
      unit: AdminStorageUnit;
      facilities: AdminStorageFacility[];
      unitTypes: AdminStorageUnitType[];
      onSaved: (fresh: AdminStorageUnit) => void;
      onCancel: () => void;
    };

/** No grid fields (gridColumn/gridRow/columnSpan/rowSpan) — see
 *  lib/api/storage-units.ts's header comment for why these stay off the
 *  form entirely this phase. */
export function StorageUnitForm(props: StorageUnitFormProps) {
  const router = useRouter();
  const unit = props.mode === "edit" ? props.unit : null;

  const [facilityId, setFacilityId] = useState(unit?.facilityId ?? props.facilities[0]?.id ?? "");
  const [unitTypeId, setUnitTypeId] = useState(unit?.unitTypeId ?? props.unitTypes[0]?.id ?? "");
  const [code, setCode] = useState(unit?.code ?? "");
  const [status, setStatus] = useState<StorageUnitStatus>(unit?.status ?? "available");
  const [isActive, setIsActive] = useState(unit?.isActive ?? true);

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
    if (code.trim().length < 1) {
      setError("Kode unit wajib diisi.");
      return;
    }

    const input: StorageUnitInput = {
      facilityId,
      unitTypeId,
      code: code.trim(),
      status,
      isActive,
    };

    startTransition(async () => {
      if (props.mode === "edit") {
        const result = await updateStorageUnitAction(props.unit.id, input);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        props.onSaved(result.data);
        return;
      }
      const result = await createStorageUnitAction(input);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/storage/units/${result.data.id}`);
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
          <Field label="Fasilitas" htmlFor="unit-facility">
            <Select value={facilityId} onValueChange={setFacilityId}>
              <SelectTrigger id="unit-facility" className="w-full" disabled={pending}>
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

          <Field label="Tipe unit" htmlFor="unit-type">
            <Select value={unitTypeId} onValueChange={setUnitTypeId}>
              <SelectTrigger id="unit-type" className="w-full" disabled={pending}>
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

        <Field label="Kode unit" htmlFor="unit-code">
          <Input
            id="unit-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Contoh: M-13"
            disabled={pending}
          />
        </Field>

        <Field label="Status" htmlFor="unit-status">
          <Select value={status} onValueChange={(v) => setStatus(v as StorageUnitStatus)}>
            <SelectTrigger id="unit-status" className="w-full" disabled={pending}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STORAGE_UNIT_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
          {props.mode === "edit" ? (pending ? "Menyimpan…" : "Simpan perubahan") : pending ? "Membuat…" : "Buat unit"}
        </Button>
        <Button
          variant="outlineSecondary"
          onClick={() => (props.mode === "edit" ? props.onCancel() : router.push("/storage/units"))}
          disabled={pending}
        >
          Batal
        </Button>
      </div>
    </div>
  );
}
