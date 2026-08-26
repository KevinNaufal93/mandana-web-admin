"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { bulkCreateStorageUnitsAction } from "@/app/actions/storage-units";
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

/** The ops-facing "add capacity fast" tool — POST /admin/storage/units/bulk.
 *  Codes are generated as "<prefix>-<NN>", continuing the existing
 *  sequence for this facility + prefix, so `codePrefix` alone (no
 *  starting number) is all the operator supplies. */
export function StorageUnitsBulkForm({
  facilities,
  unitTypes,
}: {
  facilities: AdminStorageFacility[];
  unitTypes: AdminStorageUnitType[];
}) {
  const router = useRouter();

  const [facilityId, setFacilityId] = useState(facilities[0]?.id ?? "");
  const [unitTypeId, setUnitTypeId] = useState(unitTypes[0]?.id ?? "");
  const [count, setCount] = useState("1");
  const [codePrefix, setCodePrefix] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [createdCount, setCreatedCount] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit() {
    setError(null);
    setCreatedCount(null);

    if (!facilityId) {
      setError("Pilih fasilitas terlebih dahulu.");
      return;
    }
    if (!unitTypeId) {
      setError("Pilih tipe unit terlebih dahulu.");
      return;
    }
    const countNumber = Number(count);
    if (!Number.isInteger(countNumber) || countNumber < 1 || countNumber > 500) {
      setError("Jumlah harus berupa bilangan bulat antara 1 dan 500.");
      return;
    }
    if (codePrefix.trim().length < 1) {
      setError("Awalan kode wajib diisi.");
      return;
    }

    startTransition(async () => {
      const result = await bulkCreateStorageUnitsAction({
        facilityId,
        unitTypeId,
        count: countNumber,
        codePrefix: codePrefix.trim(),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCreatedCount(result.data.length);
      setTimeout(() => router.push(`/storage/units?facilityId=${facilityId}&unitTypeId=${unitTypeId}`), 800);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {createdCount !== null && (
        <div role="status" className="rounded-lg border border-accent/60 bg-accent/10 p-3 text-sm text-primary">
          {createdCount} unit berhasil ditambahkan. Mengalihkan ke daftar unit…
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Fasilitas" htmlFor="bulk-facility">
            <Select value={facilityId} onValueChange={setFacilityId}>
              <SelectTrigger id="bulk-facility" className="w-full" disabled={pending}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {facilities.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Tipe unit" htmlFor="bulk-unit-type">
            <Select value={unitTypeId} onValueChange={setUnitTypeId}>
              <SelectTrigger id="bulk-unit-type" className="w-full" disabled={pending}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {unitTypes.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Jumlah unit" htmlFor="bulk-count">
            <Input
              id="bulk-count"
              type="number"
              min={1}
              max={500}
              step={1}
              value={count}
              onChange={(e) => setCount(e.target.value)}
              disabled={pending}
            />
          </Field>
          <Field label="Awalan kode" htmlFor="bulk-code-prefix">
            <Input
              id="bulk-code-prefix"
              value={codePrefix}
              onChange={(e) => setCodePrefix(e.target.value)}
              placeholder="Contoh: M"
              disabled={pending}
            />
          </Field>
        </div>
        <p className="text-xs text-muted-foreground">
          Kode dibuat otomatis sebagai &ldquo;awalan-NN&rdquo;, melanjutkan urutan yang sudah ada untuk fasilitas
          dan awalan ini.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="secondary" onClick={handleSubmit} disabled={pending}>
          {pending ? "Menambahkan…" : "Tambah unit massal"}
        </Button>
        <Button variant="outlineSecondary" onClick={() => router.push("/storage/units")} disabled={pending}>
          Batal
        </Button>
      </div>
    </div>
  );
}
