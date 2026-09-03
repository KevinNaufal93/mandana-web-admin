"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { ImagePicker, type ImagePickerValue } from "@/components/media/image-picker";
import { createMovingAddonAction, updateMovingAddonAction } from "@/app/actions/moving";
import { MOVING_ADDON_KINDS, MOVING_ADDON_PRICING_MODELS, type MovingAddonKind, type MovingAddonPricingModel } from "@/lib/moving/query";
import type { AdminMovingAddon, MovingAddonInput } from "@/lib/api/moving";

const KIND_LABEL: Record<MovingAddonKind, string> = {
  helper: "Helper",
  packaging: "Packaging",
  waiting: "Waiting",
  insurance: "Insurance",
  toll: "Toll — diterapkan otomatis, tidak dipilih pelanggan",
  other: "Lainnya",
};

const PRICING_MODEL_LABEL: Record<MovingAddonPricingModel, string> = {
  flat: "Flat (sekali bayar)",
  per_unit: "Per unit (dikali kuantitas)",
  percent: "Persen (dari nilai barang)",
};

function Field({
  label,
  htmlFor,
  children,
  hint,
  className,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor}>{label}</Label>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

type MovingAddonFormProps =
  | { mode: "create" }
  | { mode: "edit"; addon: AdminMovingAddon; onSaved: (fresh: AdminMovingAddon) => void; onCancel: () => void };

/**
 * The one Moving form with real conditional logic:
 *  - unitPrice shows when pricingModel !== "percent"; percentBps shows
 *    when it is. Exactly one of the two is ever sent.
 *  - minQty/maxQty steppers are hidden for kind: "toll" — its per_unit
 *    pricing multiplies distance, not a customer-selected quantity — but
 *    still submitted at their default values (1/10) since
 *    CreateMovingAddonDto requires both fields regardless of kind.
 *  - unitPrice/percentBps must be strictly > 0 — MovingAddonsService
 *    .validatePricingFields rejects 0 despite Swagger's `minimum: 0`.
 */
export function MovingAddonForm(props: MovingAddonFormProps) {
  const router = useRouter();
  const addon = props.mode === "edit" ? props.addon : null;

  const [name, setName] = useState(addon?.name ?? "");
  const [slug, setSlug] = useState(addon?.slug ?? "");
  const [description, setDescription] = useState(addon?.description ?? "");
  const [kind, setKind] = useState<MovingAddonKind>(addon?.kind ?? "helper");
  const [pricingModel, setPricingModel] = useState<MovingAddonPricingModel>(addon?.pricingModel ?? "flat");
  const [unitPrice, setUnitPrice] = useState(addon && addon.pricingModel !== "percent" ? String(addon.unitPrice) : "");
  const [percentBps, setPercentBps] = useState(addon?.percentBps != null ? String(addon.percentBps) : "");
  const [minCharge, setMinCharge] = useState(addon?.minCharge != null ? String(addon.minCharge) : "");
  const [maxCharge, setMaxCharge] = useState(addon?.maxCharge != null ? String(addon.maxCharge) : "");
  const [unitLabel, setUnitLabel] = useState(addon?.unitLabel ?? "");
  const [minQty, setMinQty] = useState(addon ? String(addon.minQty) : "1");
  const [maxQty, setMaxQty] = useState(addon ? String(addon.maxQty) : "10");
  const [doublesOnRoundTrip, setDoublesOnRoundTrip] = useState(addon?.doublesOnRoundTrip ?? false);
  const [isActive, setIsActive] = useState(addon?.isActive ?? true);
  const [sortOrder, setSortOrder] = useState(addon ? String(addon.sortOrder) : "0");
  const [image, setImage] = useState<ImagePickerValue>({
    mediaAssetId: addon?.mediaAssetId ?? null,
    preview: addon?.image ? { url: addon.image.url, alt: addon.image.alt } : null,
  });

  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const isPercent = pricingModel === "percent";
  const isToll = kind === "toll";

  function handleSubmit() {
    setError(null);

    if (name.trim().length < 2) {
      setError("Nama minimal 2 karakter.");
      return;
    }

    let unitPriceNumber: number | undefined;
    let percentBpsNumber: number | undefined;
    if (isPercent) {
      percentBpsNumber = Number(percentBps);
      if (percentBps.trim() === "" || !Number.isInteger(percentBpsNumber) || percentBpsNumber <= 0) {
        setError("Persentase (basis points) wajib diisi dan harus lebih dari 0.");
        return;
      }
    } else {
      unitPriceNumber = Number(unitPrice);
      if (unitPrice.trim() === "" || !Number.isInteger(unitPriceNumber) || unitPriceNumber <= 0) {
        setError("Harga satuan wajib diisi dan harus lebih dari 0 — 0 akan ditolak server.");
        return;
      }
    }

    let minChargeNumber: number | undefined;
    if (minCharge.trim()) {
      minChargeNumber = Number(minCharge);
      if (!Number.isInteger(minChargeNumber) || minChargeNumber < 0) {
        setError("Batas bawah harus berupa bilangan bulat (Rupiah) 0 atau lebih.");
        return;
      }
    }
    let maxChargeNumber: number | undefined;
    if (maxCharge.trim()) {
      maxChargeNumber = Number(maxCharge);
      if (!Number.isInteger(maxChargeNumber) || maxChargeNumber < 0) {
        setError("Batas atas harus berupa bilangan bulat (Rupiah) 0 atau lebih.");
        return;
      }
    }

    const minQtyNumber = Number(minQty);
    const maxQtyNumber = Number(maxQty);
    if (!Number.isInteger(minQtyNumber) || minQtyNumber < 1) {
      setError("Kuantitas minimum harus berupa bilangan bulat, minimal 1.");
      return;
    }
    if (!Number.isInteger(maxQtyNumber) || maxQtyNumber < minQtyNumber) {
      setError("Kuantitas maksimum harus ≥ kuantitas minimum.");
      return;
    }

    const sortOrderNumber = Number(sortOrder);
    if (!Number.isInteger(sortOrderNumber) || sortOrderNumber < 0) {
      setError("Urutan harus berupa bilangan bulat 0 atau lebih.");
      return;
    }

    const input: MovingAddonInput = {
      name: name.trim(),
      slug: slug.trim() || undefined,
      description: description || undefined,
      kind,
      pricingModel,
      unitPrice: unitPriceNumber,
      percentBps: percentBpsNumber,
      minCharge: minChargeNumber,
      maxCharge: maxChargeNumber,
      unitLabel: unitLabel.trim() || undefined,
      minQty: minQtyNumber,
      maxQty: maxQtyNumber,
      doublesOnRoundTrip,
      mediaAssetId: image.mediaAssetId ?? undefined,
      isActive,
      sortOrder: sortOrderNumber,
    };

    startTransition(async () => {
      if (props.mode === "edit") {
        const result = await updateMovingAddonAction(props.addon.id, input);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        props.onSaved(result.data);
        return;
      }
      const result = await createMovingAddonAction(input);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/moving/addons/${result.data.id}`);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
            <Field label="Nama" htmlFor="addon-name">
              <Input id="addon-name" value={name} onChange={(e) => setName(e.target.value)} disabled={pending} />
            </Field>
            <Field label="Slug (opsional)" htmlFor="addon-slug">
              <Input
                id="addon-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="Dibuat otomatis dari nama bila dikosongkan"
                disabled={pending}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Jenis" htmlFor="addon-kind">
                <Select value={kind} onValueChange={(v) => setKind(v as MovingAddonKind)}>
                  <SelectTrigger id="addon-kind" disabled={pending}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MOVING_ADDON_KINDS.map((k) => (
                      <SelectItem key={k} value={k}>
                        {KIND_LABEL[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Model harga" htmlFor="addon-pricing-model">
                <Select value={pricingModel} onValueChange={(v) => setPricingModel(v as MovingAddonPricingModel)}>
                  <SelectTrigger id="addon-pricing-model" disabled={pending}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MOVING_ADDON_PRICING_MODELS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {PRICING_MODEL_LABEL[m]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </div>

          <div className="rounded-lg border border-border p-4">
            <Label>Deskripsi</Label>
            <div className="mt-1.5">
              <RichTextEditor
                defaultValue={description}
                onChange={setDescription}
                placeholder="Tulis deskripsi add-on…"
                disabled={pending}
              />
            </div>
          </div>

          <div className="rounded-lg border border-border p-4">
            <ImagePicker value={image} onChange={setImage} purpose="cover" disabled={pending} />
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
            {isPercent ? (
              <Field
                label="Persentase (basis points)"
                htmlFor="addon-percent-bps"
                hint="20 = 0,20% dari nilai barang. Bukan persen penuh — jangan salah dengan bandPct di Pengaturan."
              >
                <Input
                  id="addon-percent-bps"
                  type="number"
                  min={1}
                  step={1}
                  value={percentBps}
                  onChange={(e) => setPercentBps(e.target.value)}
                  disabled={pending}
                />
              </Field>
            ) : (
              <Field label="Harga satuan (Rp)" htmlFor="addon-unit-price" hint="Harus lebih dari 0.">
                <Input
                  id="addon-unit-price"
                  type="number"
                  min={1}
                  step={1}
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  disabled={pending}
                />
              </Field>
            )}
            <Field label="Batas bawah (Rp, opsional)" htmlFor="addon-min-charge">
              <Input
                id="addon-min-charge"
                type="number"
                min={0}
                step={1}
                value={minCharge}
                onChange={(e) => setMinCharge(e.target.value)}
                disabled={pending}
              />
            </Field>
            <Field label="Batas atas (Rp, opsional)" htmlFor="addon-max-charge">
              <Input
                id="addon-max-charge"
                type="number"
                min={0}
                step={1}
                value={maxCharge}
                onChange={(e) => setMaxCharge(e.target.value)}
                disabled={pending}
              />
            </Field>
            <Field label="Label satuan (opsional)" htmlFor="addon-unit-label">
              <Input
                id="addon-unit-label"
                value={unitLabel}
                onChange={(e) => setUnitLabel(e.target.value)}
                placeholder="mis. orang, jam"
                disabled={pending}
              />
            </Field>
          </div>

          {!isToll && (
            <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Kuantitas min." htmlFor="addon-min-qty">
                  <Input
                    id="addon-min-qty"
                    type="number"
                    min={1}
                    step={1}
                    value={minQty}
                    onChange={(e) => setMinQty(e.target.value)}
                    disabled={pending}
                  />
                </Field>
                <Field label="Kuantitas maks." htmlFor="addon-max-qty">
                  <Input
                    id="addon-max-qty"
                    type="number"
                    min={1}
                    step={1}
                    value={maxQty}
                    onChange={(e) => setMaxQty(e.target.value)}
                    disabled={pending}
                  />
                </Field>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
            <Field label="Urutan" htmlFor="addon-sort-order">
              <Input
                id="addon-sort-order"
                type="number"
                min={0}
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                disabled={pending}
              />
            </Field>
            <label className="mt-1 flex items-center gap-2 text-sm text-primary">
              <input
                type="checkbox"
                className="accent-primary"
                checked={doublesOnRoundTrip}
                onChange={(e) => setDoublesOnRoundTrip(e.target.checked)}
                disabled={pending}
              />
              Dobel saat perjalanan pulang-pergi
            </label>
            <label className="flex items-center gap-2 text-sm text-primary">
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
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="secondary" onClick={handleSubmit} disabled={pending}>
          {props.mode === "edit" ? (pending ? "Menyimpan…" : "Simpan perubahan") : pending ? "Membuat…" : "Buat add-on"}
        </Button>
        <Button
          variant="outlineSecondary"
          onClick={() => (props.mode === "edit" ? props.onCancel() : router.push("/moving/addons"))}
          disabled={pending}
        >
          Batal
        </Button>
      </div>
    </div>
  );
}
