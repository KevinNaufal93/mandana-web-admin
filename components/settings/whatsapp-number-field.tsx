"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WHATSAPP_NUMBER_MAX_LENGTH } from "@/lib/whatsapp-number";

/**
 * One labelled WhatsApp number input, shared by the four settings forms that
 * each own a number (Mandana Move / Space / Living under their own
 * Pengaturan tab, and the General number under SEO → Pengaturan Umum).
 * Validation lives in lib/whatsapp-number.ts; the parent form runs it on
 * submit, the same way every other field in these forms is checked.
 */
export function WhatsappNumberField({
  id,
  label,
  hint,
  value,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="mt-1.5 max-w-64">
        <Input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="off"
          placeholder="+6281234567890"
          maxLength={WHATSAPP_NUMBER_MAX_LENGTH}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
