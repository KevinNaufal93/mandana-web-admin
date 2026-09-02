/**
 * Canvas-based crop: takes an object/data URL and a pixel-space crop
 * rectangle (as reported by <Cropper>'s onCropComplete) and returns a new
 * File containing just that rectangle, re-encoded at the original file's
 * mime type. Pure client-side code (canvas, Image, Blob) — no
 * "server-only" here, this runs in the browser before upload.
 */
export async function cropImageToFile(
  imageSrc: string,
  crop: { x: number; y: number; width: number; height: number },
  fileName: string,
  mimeType: string,
): Promise<File> {
  const image = await loadImage(imageSrc);

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(crop.width);
  canvas.height = Math.round(crop.height);

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context tidak tersedia.");

  ctx.drawImage(
    image,
    Math.round(crop.x),
    Math.round(crop.y),
    Math.round(crop.width),
    Math.round(crop.height),
    0,
    0,
    Math.round(crop.width),
    Math.round(crop.height),
  );

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mimeType, 0.92));
  if (!blob) throw new Error("Gagal memproses hasil crop.");

  return new File([blob], fileName, { type: mimeType });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Gagal memuat gambar untuk di-crop."));
    image.src = src;
  });
}
