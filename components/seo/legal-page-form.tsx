"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { updateLegalPageAction } from "@/app/actions/legal";
import type { AdminLegalPage, LegalPageKey } from "@/lib/legal/shared";

export function LegalPageForm({ pageKey, page }: { pageKey: LegalPageKey; page: AdminLegalPage }) {
  const [title, setTitle] = useState(page.title);
  const [bodyHtml, setBodyHtml] = useState(page.bodyHtml);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit() {
    setError(null);
    setSuccess(false);

    if (title.trim().length < 2) {
      setError("Judul minimal 2 karakter.");
      return;
    }

    startTransition(async () => {
      const result = await updateLegalPageAction(pageKey, {
        title: title.trim(),
        bodyHtml,
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

      <div>
        <Label htmlFor="legal-title">Judul halaman</Label>
        <Input
          id="legal-title"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setSuccess(false);
          }}
          disabled={pending}
          className="mt-1.5"
        />
      </div>

      <div>
        <Label>Isi halaman</Label>
        <div className="mt-1.5">
          <RichTextEditor
            defaultValue={bodyHtml}
            onChange={(v) => {
              setBodyHtml(v);
              setSuccess(false);
            }}
            placeholder="Tulis isi halaman…"
            disabled={pending}
          />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Draf awal berisi kerangka bagian dengan placeholder &ldquo;[Isi bagian ini]&rdquo; — lengkapi setiap
          bagian, lalu minta wording ini ditinjau sebelum dipublikasikan.
        </p>
      </div>

      <div>
        <Button variant="secondary" onClick={handleSubmit} disabled={pending}>
          {pending ? "Menyimpan…" : "Simpan perubahan"}
        </Button>
      </div>
    </div>
  );
}
