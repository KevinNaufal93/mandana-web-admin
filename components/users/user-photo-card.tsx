"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import Cropper, { type Area, type Point } from "react-easy-crop";
import { ImageOff } from "lucide-react";
import { DetailCard } from "@/components/ui/detail-card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { setUserPhotoAction } from "@/app/actions/users";
import { cropImageToFile } from "@/lib/media/crop-image";
import type { AdminUser } from "@/lib/api/users";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * A freshly picked file, held only long enough to crop it. `url` is an
 * object URL for <Cropper>'s `image` prop — always revoked when this
 * state is cleared (crop applied, original used as-is, or dialog
 * dismissed), never left to leak for the rest of the session the way the
 * post-upload `previewUrl` deliberately is (see its own comment below).
 */
interface PendingCrop {
  file: File;
  url: string;
}

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

  const [pendingCrop, setPendingCrop] = useState<PendingCrop | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [cropping, setCropping] = useState(false);

  const onCropComplete = useCallback((_croppedArea: Area, pixels: Area) => setCroppedAreaPixels(pixels), []);

  function closeCropDialog() {
    if (pendingCrop) URL.revokeObjectURL(pendingCrop.url);
    setPendingCrop(null);
    setCroppedAreaPixels(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  }

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

    // Always offer a crop step before uploading — the card renders this
    // as a square (object-cover), so a non-square source photo (almost
    // any phone camera shot) would otherwise get center-cropped
    // automatically, with no say over which part survives.
    setPendingCrop({ file, url: URL.createObjectURL(file) });
  }

  function submitPhoto(file: File) {
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

  async function handleApplyCrop() {
    if (!pendingCrop || !croppedAreaPixels) return;
    setCropping(true);
    try {
      const cropped = await cropImageToFile(
        pendingCrop.url,
        croppedAreaPixels,
        pendingCrop.file.name,
        pendingCrop.file.type,
      );
      closeCropDialog();
      submitPhoto(cropped);
    } catch {
      setError("Gagal memproses crop gambar.");
    } finally {
      setCropping(false);
    }
  }

  function handleUseOriginal() {
    if (!pendingCrop) return;
    const { file } = pendingCrop;
    closeCropDialog();
    submitPhoto(file);
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

      <Dialog open={pendingCrop !== null} onOpenChange={(open) => !open && closeCropDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Sesuaikan foto</DialogTitle>
            <DialogDescription>
              Foto ditampilkan sebagai bujur sangkar — geser dan perbesar untuk memilih bagian yang tampil.
            </DialogDescription>
          </DialogHeader>

          {pendingCrop && (
            <>
              <div className="relative h-72 w-full overflow-hidden rounded-md bg-muted">
                <Cropper
                  image={pendingCrop.url}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="rect"
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                />
              </div>
              <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                Perbesar
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </label>
            </>
          )}

          <DialogFooter>
            <Button type="button" variant="outlineSecondary" onClick={closeCropDialog} disabled={cropping || pending}>
              Batal
            </Button>
            <Button type="button" variant="outlineSecondary" onClick={handleUseOriginal} disabled={cropping || pending}>
              Gunakan gambar asli
            </Button>
            <Button type="button" variant="secondary" onClick={handleApplyCrop} disabled={cropping || pending || !croppedAreaPixels}>
              {cropping ? "Memproses..." : "Terapkan & unggah"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DetailCard>
  );
}
