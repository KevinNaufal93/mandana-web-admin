"use client";

import { useRef, useState, useTransition } from "react";
import { ImageOff } from "lucide-react";
import { DetailCard } from "@/components/ui/detail-card";
import { Button } from "@/components/ui/button";
import { setUserPhotoAction } from "@/app/actions/users";
import type { AdminUser } from "@/lib/api/users";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * No /admin/users response, including this action's own response, ever
 * carries a renderable image URL -- photoMediaAsset is never loaded
 * server-side (see AdminUser's doc comment in lib/api/users.ts). So this
 * card can only ever show a LOCAL preview, built from the just-uploaded
 * File via createObjectURL, for the remainder of this session. On a fresh
 * page load it falls back to a presence indicator ("Foto tersimpan") or
 * the empty frame -- never a real image.
 */
export function UserPhotoCard({ user, onSaved }: { user: AdminUser; onSaved: (fresh: AdminUser) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null);
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Format gambar harus JPEG, PNG, atau WebP.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError("Ukuran gambar maksimal 20MB.");
      return;
    }

    const formData = new FormData();
    formData.set("file", file);

    startTransition(async () => {
      const result = await setUserPhotoAction(user.id, formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPreviewUrl(URL.createObjectURL(file));
      onSaved(result.data);
    });
  }

  const hasPhoto = previewUrl !== null || user.photoMediaAssetId !== null;

  return (
    <DetailCard title="Foto agen">
      <div className="flex items-start gap-4">
        {previewUrl ? (
          // Local object URL, not a remote asset next/image can optimize.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt={user.name}
            className="aspect-square w-24 shrink-0 rounded-md object-cover"
          />
        ) : (
          <div className="flex aspect-square w-24 shrink-0 items-center justify-center rounded-md border border-dashed border-border text-muted-foreground">
            <ImageOff className="size-5" />
          </div>
        )}

        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            {hasPhoto
              ? previewUrl
                ? "Foto diunggah pada sesi ini."
                : "Foto tersimpan. Pratinjau tidak tersedia dari server."
              : "Belum ada foto."}
          </p>
          <p className="text-xs text-muted-foreground">
            Ditampilkan pada kartu agen di halaman detail properti. JPEG, PNG, atau WebP, maksimal 20MB.
          </p>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            type="button"
            variant="outlineSecondary"
            className="w-fit"
            onClick={() => inputRef.current?.click()}
            disabled={pending}
          >
            {pending ? "Mengunggah..." : hasPhoto ? "Ganti foto" : "Unggah foto"}
          </Button>
        </div>
      </div>
    </DetailCard>
  );
}
