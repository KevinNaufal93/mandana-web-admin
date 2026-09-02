"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Cropper, { type Area, type Point } from "react-easy-crop";
import { ImageOff } from "lucide-react";
import { DetailCard } from "@/components/ui/detail-card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { setUserPhotoAction } from "@/app/actions/users";
import { cropImageToFile } from "@/lib/media/crop-image";
import { initials } from "@/lib/format";
import type { AdminUser } from "@/lib/api/users";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * A freshly picked file, held only long enough to crop it. `url` is an
 * object URL for <Cropper>'s `image` prop — always revoked when this
 * state is cleared (crop applied, original used as-is, or dialog
 * dismissed). Nothing else in this component holds an object URL past
 * that point — see the UserPhotoCard doc comment below for why a
 * post-upload one is no longer needed.
 */
interface PendingCrop {
  file: File;
  url: string;
}

/**
 * `user.photo` carries a real, renderable `{url, srcset, ...}` whenever a
 * photo is on file -- every /admin/users read path now loads the
 * photoMediaAsset relation and serializes it through MediaService's
 * buildImageDto() on the API side (mandana-api's UsersMapper), the same
 * way properties.agent.photo already worked. It's mint-fresh even right
 * after an upload: setUserPhotoAction's response is this same shape, so
 * there's no need for a local object-URL preview to bridge the gap
 * anymore -- see git history for the version of this file that had one.
 *
 * photoMediaAssetId staying non-null while `photo` comes back null
 * shouldn't happen in practice (every read path loads the relation, and
 * the FK is DB-level ON DELETE SET NULL, so the two can't drift) -- kept
 * as a defensive fallback rather than assumed impossible. That fallback is
 * an initials tile, the same presence indicator used everywhere else in
 * this app for "a person, no photo" (components/shell/user-menu-dropdown.tsx),
 * NOT the ImageOff glyph this app uses everywhere for "no image" (see
 * ImagePicker, the properties/event-support tables) -- reusing ImageOff
 * here would claim nothing's on file when something is.
 */
export function UserPhotoCard({ user, onSaved }: { user: AdminUser; onSaved: (fresh: AdminUser) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
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

  const hasPhoto = user.photoMediaAssetId !== null;

  return (
    <DetailCard title="Foto agen">
      <div className="flex items-start gap-4">
        {user.photo ? (
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-md bg-muted">
            <Image
              src={user.photo.url}
              alt={user.photo.alt ?? user.name}
              fill
              className="object-cover"
              sizes="96px"
            />
          </div>
        ) : hasPhoto ? (
          // A photo IS on file server-side -- this particular response just
          // didn't carry it (see the file header comment; shouldn't happen
          // in practice). A solid initials tile reads as "something's here"
          // at a glance, unlike ImageOff's dashed "nothing's here" frame,
          // which is what this state used to (wrongly) reuse.
          <Avatar className="h-24 w-24 shrink-0 rounded-md">
            <AvatarFallback className="rounded-md bg-primary text-2xl font-medium text-card">
              {initials(user.name)}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="flex aspect-square w-24 shrink-0 items-center justify-center rounded-md border border-dashed border-border text-muted-foreground">
            <ImageOff className="size-5" />
          </div>
        )}

        <div className="flex flex-col gap-2">
          {!user.photo && (
            // No caption once a real photo renders — same call ImagePicker
            // already makes (components/media/image-picker.tsx): the image
            // is its own confirmation, a status line under it is redundant.
            <p className="text-sm text-muted-foreground">
              {hasPhoto ? "Foto tersimpan. Pratinjau tidak tersedia saat ini." : "Belum ada foto."}
            </p>
          )}
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
