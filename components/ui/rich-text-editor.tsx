"use client";

import { useEffect, useRef, useState, useTransition, type ChangeEvent } from "react";
import type Quill from "quill";
import "quill/dist/quill.snow.css";
import { cn } from "@/lib/utils";
import { uploadMediaAction, getMediaAssetAction } from "@/app/actions/media";
import type { MediaPurpose } from "@/lib/api/media";

export interface RichTextEditorProps {
  /** Initial HTML only — Quill owns the DOM after mount. See the mount
   *  effect below for why this isn't kept in sync on every render. */
  defaultValue: string;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /**
   * Adds the toolbar image button plus a handler that uploads through
   * POST /admin/media and inserts the resulting HTTPS URL inline. Off by
   * default — every other caller's toolbar is a subset of the API's
   * sanitizer allow-list (RICH_TEXT_SANITIZE_OPTIONS) and should stay
   * exactly as-is; only opt in where that allow-list actually permits
   * inline `<img>` for a reason (currently: articles, whose
   * figure/figcaption + img entries were added specifically for this —
   * see docs/rich-text-descriptions.md).
   *
   * Depends on GET /admin/media/:id returning a renderable image URL,
   * which it does not yet — verified against
   * mandana-api/src/modules/media/media.service.ts: findOneOrFail()
   * returns the bare MediaAsset entity (no `image` field); only
   * findAllAdmin()'s list rows run buildImageDto(). See
   * lib/api/media.ts's MediaAssetDetail for the one-line backend change
   * this needs. Until it ships, a resolve failure surfaces inline
   * ("Gagal memuat URL gambar…") and nothing is inserted — this never
   * writes a broken src into bodyHtml.
   */
  allowImages?: boolean;
  /** purpose sent at upload time when allowImages is on. Defaults to
   *  "cover" — the media guide's "standard content image" case — not
   *  "hero", which is reserved for the entity's own single cover image
   *  (handled by that form's own <ImagePicker>, not this editor). */
  imagePurpose?: MediaPurpose;
}

/**
 * Thin hand-rolled wrapper around vanilla `quill` — deliberately not
 * react-quill, which calls ReactDOM.findDOMNode (removed in React 19) and
 * is broken on this app's React version. Mounts Quill imperatively into a
 * ref'd div and reads its HTML back out on every change.
 *
 * Toolbar is a subset of mandana-api's RICH_TEXT_SANITIZE_OPTIONS allow-list
 * (mandana-api/src/common/rich-text/rich-text.config.ts) — headers, bold/
 * italic/underline/strike, lists, blockquote, links — MINUS the image
 * button. Quill's default image handler inlines a base64 data: URI, which
 * the API's sanitizer strips outright ("images must go through the media
 * pipeline": POST /admin/media). Wiring that upload is future work; until
 * then the button would just silently eat images on save.
 */
export function RichTextEditor({
  defaultValue,
  onChange,
  placeholder,
  disabled,
  className,
  allowImages = false,
  imagePurpose = "cover",
}: RichTextEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<Quill | null>(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  // Image-insert plumbing — inert unless allowImages is on.
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Captured synchronously the instant the toolbar button fires, before
  // the OS file dialog steals focus: by the time the async upload below
  // resolves, quill.getSelection() would return null.
  const pendingRangeRef = useRef<{ index: number; length: number } | null>(null);
  const [imagePending, startImageTransition] = useTransition();
  const [imageError, setImageError] = useState<string | null>(null);

  // Quill's own Toolbar module preventDefault()s the button's mousedown,
  // so the editor keeps focus/selection through this click — no need to
  // force it the way ImagePicker-adjacent flows sometimes do.
  function handleImageButton() {
    const quill = quillRef.current;
    if (!quill) return;
    pendingRangeRef.current = quill.getSelection() ?? { index: quill.getLength(), length: 0 };
    setImageError(null);
    fileInputRef.current?.click();
  }

  function handleFileSelected(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // so picking the same file again still fires onChange
    if (!file) return;

    const quill = quillRef.current;
    const range = pendingRangeRef.current ?? { index: quill?.getLength() ?? 0, length: 0 };

    const formData = new FormData();
    formData.set("file", file);
    formData.set("purpose", imagePurpose);

    setImageError(null);
    startImageTransition(async () => {
      const uploaded = await uploadMediaAction(formData);
      if (!uploaded.ok) {
        setImageError(uploaded.error);
        return;
      }
      // See this component's allowImages doc comment: the endpoint this
      // resolves through doesn't return a URL yet. Surfacing that here,
      // rather than inserting nothing silently, is deliberate — an editor
      // who just watched an upload succeed needs to know why no image
      // appeared, not just see it fail to happen.
      const resolved = await getMediaAssetAction(uploaded.data.id);
      if (!resolved.ok || !resolved.data.image) {
        setImageError("Gambar berhasil diunggah, tetapi URL-nya belum bisa diambil — fitur ini menunggu pembaruan backend.");
        return;
      }
      if (!quill) return;
      quill.insertEmbed(range.index, "image", resolved.data.image.url, "user");
      quill.setSelection(range.index + 1, 0, "user");
    });
  }

  // Mounts once. `defaultValue` after the initial mount is intentionally
  // not synced back in — Quill owns its own DOM once live, and a
  // controlled re-render on every keystroke (setting .innerHTML from
  // outside) would fight the cursor position. Callers that need to reset
  // the editor's content (e.g. re-entering edit mode with fresh data)
  // should remount this component with a `key`.
  useEffect(() => {
    let cancelled = false;

    import("quill").then(({ default: QuillCtor }) => {
      if (cancelled || !containerRef.current) return;

      const quill = new QuillCtor(containerRef.current, {
        theme: "snow",
        placeholder,
        modules: {
          // The `allowImages` branch is a distinct object shape
          // ({container, handlers}), not a variation of the plain-array
          // shape below — kept fully separate so the default (false) path
          // is byte-for-byte what every other caller has always gotten.
          toolbar: allowImages
            ? {
                container: [
                  [{ header: [1, 2, 3, false] }],
                  ["bold", "italic", "underline", "strike"],
                  [{ list: "ordered" }, { list: "bullet" }],
                  ["blockquote", "link"],
                  ["image"],
                  ["clean"],
                ],
                handlers: { image: handleImageButton },
              }
            : [
                [{ header: [1, 2, 3, false] }],
                ["bold", "italic", "underline", "strike"],
                [{ list: "ordered" }, { list: "bullet" }],
                ["blockquote", "link"],
                ["clean"],
              ],
        },
      });
      quill.root.innerHTML = defaultValue;
      if (disabled) quill.disable();
      quillRef.current = quill;

      quill.on("text-change", () => {
        const html = quill.root.innerHTML;
        // Quill's "empty" state is literally "<p><br></p>", not "" — the
        // sanitizer already normalizes this server-side, but normalizing
        // it here too keeps the client-side "empty description" checks
        // (e.g. the description card's placeholder) correct pre-save.
        onChangeRef.current(html === "<p><br></p>" ? "" : html);
      });
    });

    return () => {
      cancelled = true;
      quillRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    quillRef.current?.enable(!disabled);
  }, [disabled]);

  return (
    <div className={cn("rich-text-editor", className)}>
      <div ref={containerRef} />
      {allowImages && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileSelected}
          />
          {imagePending && <p className="mt-1.5 text-xs text-muted-foreground">Mengunggah gambar…</p>}
          {imageError && (
            <p role="alert" className="mt-1.5 text-sm text-destructive">
              {imageError}
            </p>
          )}
        </>
      )}
    </div>
  );
}
