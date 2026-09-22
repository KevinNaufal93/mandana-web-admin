"use client";

import { useEffect, useRef, useState, useTransition, type ChangeEvent } from "react";
import type Quill from "quill";
import "quill/dist/quill.snow.css";
import { ArrowDown, ArrowUp, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getMediaAssetAction } from "@/app/actions/media";
import { uploadMediaSafe } from "@/lib/media/prepare-upload";
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
   * POST /admin/media and inserts the result as its own block — split out
   * of the surrounding paragraph if the cursor was mid-text — with a
   * follow-up toolbar (see the "selected image" bar below the editor) for
   * moving it past neighboring paragraphs, editing its alt text, or
   * removing it. Off by default — every other caller's toolbar is a
   * subset of the API's sanitizer allow-list (RICH_TEXT_SANITIZE_OPTIONS)
   * and should stay exactly as-is; only opt in where that allow-list
   * actually permits inline `<img>` for a reason (currently: articles,
   * whose figure/figcaption + img entries were added specifically for
   * this — see docs/rich-text-descriptions.md).
   *
   * Resolves the just-uploaded id's renderable URL through
   * MediaService.findOneAdmin() (mandana-api/src/modules/media/
   * media.service.ts) — the one endpoint in this file that needs a real
   * URL back, unlike ImagePicker's local blob: preview. A resolve failure
   * still surfaces inline ("Gagal memuat URL gambar…") rather than
   * silently inserting nothing — this never writes a broken src into
   * bodyHtml.
   */
  allowImages?: boolean;
  /** purpose sent at upload time when allowImages is on. Defaults to
   *  "cover" — the media guide's "standard content image" case — not
   *  "hero", which is reserved for the entity's own single cover image
   *  (handled by that form's own <ImagePicker>, not this editor). */
  imagePurpose?: MediaPurpose;
}

/** Which image (by document index) is currently selected in the editor —
 *  drives the "selected image" toolbar below it. `alt` mirrors the blot's
 *  current attribute so the alt-text input stays a controlled field
 *  without re-reading the DOM on every keystroke. */
interface SelectedImage {
  index: number;
  alt: string;
}

/** width/height are carried as HTML attributes (the sanitizer's `img`
 *  allow-list already permits both) purely so the browser can reserve the
 *  correct aspect ratio before the image loads — mandana-web's
 *  `.prose-artikel img` rule renders it at `width:100%; height:auto`
 *  regardless, but modern browsers still derive the intrinsic aspect
 *  ratio from these attributes even when CSS overrides the final size,
 *  which is what avoids a layout shift as each image finishes loading. */
interface ImageDims {
  width?: string;
  height?: string;
}

/**
 * Inserts an image embed so it always ends up alone on its own line,
 * splitting the current paragraph there if the cursor was mid-text, and
 * adding a line break after it if one doesn't already follow — otherwise
 * Quill would happily weld the image inline between whatever text
 * surrounds `index`. Used both for a fresh insert from the toolbar button
 * and for re-inserting an image that's being moved past a neighboring
 * line (see moveSelectedImage below), so "own line" placement only has to
 * be gotten right in one place.
 *
 * Verified against the installed quill/parchment source rather than
 * assumed: an embed's `length()` is 1 (parchment's ShadowBlot default)
 * and a line's own trailing newline adds 1 more (quill's Block.length()),
 * so checking the actual character before/after `index` — not blot
 * lengths — is what tells us whether a line break is still needed here.
 */
function insertImageAsOwnLine(
  quill: Quill,
  index: number,
  src: string,
  alt: string,
  dims: ImageDims = {},
): number {
  let at = index;
  const before = at > 0 ? quill.getText(at - 1, 1) : "\n";
  if (before !== "\n") {
    quill.insertText(at, "\n", "user");
    at += 1;
  }
  quill.insertEmbed(at, "image", src, "user");
  const after = quill.getText(at + 1, 1);
  if (after !== "\n") {
    quill.insertText(at + 1, "\n", "user");
  }
  const formats: Record<string, string> = {};
  if (alt) formats.alt = alt;
  if (dims.width) formats.width = dims.width;
  if (dims.height) formats.height = dims.height;
  if (Object.keys(formats).length > 0) quill.formatText(at, 1, formats, "user");
  quill.setSelection(at, 1, "user");
  return at;
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
 * button, which only `allowImages` callers get (see its doc comment).
 * Quill's default image handler inlines a base64 data: URI, which the
 * API's sanitizer strips outright ("images must go through the media
 * pipeline": POST /admin/media) — the handler wired up here uploads there
 * instead and inserts the resulting HTTPS URL.
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
  // The "selected image" toolbar rendered below the editor — see the
  // click-outside effect further down, which needs to tell "click landed
  // on one of the toolbar's own controls" apart from "click landed
  // somewhere that should close it."
  const toolbarRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<Quill | null>(null);
  // The Quill *class* (not instance) — only needed for allowImages'
  // click-to-select handler, which maps a clicked <img> DOM node back to
  // its blot via the static `Quill.find()`. Captured off the same dynamic
  // import that constructs the instance below, since this file otherwise
  // only has a type-only `import type Quill` (no runtime binding).
  const quillCtorRef = useRef<typeof Quill | null>(null);
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
  // The image currently clicked/selected in the editor, if any — shows
  // the Naik/Turun/alt-text/Hapus bar below the editor. A *new* selection
  // is always driven by Quill's own selection-change event (see the mount
  // effect), so it can't drift out of sync with what's actually selected
  // in the document. Clearing it back to null is NOT solely selection-
  // change's job, though: that event also fires (with `range: null`)
  // whenever focus merely leaves the editor, which happens the instant
  // the alt-text input below is focused — treating that as a deselect
  // would hide the toolbar the moment you click into its own input. See
  // the click-outside effect below for what actually clears it.
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);

  // Closes the toolbar on a click outside both the editor and the toolbar
  // itself — the counterpart to selection-change deliberately ignoring
  // `range: null` above. A click *inside* the editor on non-image content
  // still goes through selection-change (a real, non-null range), so this
  // only needs to handle "clicked away entirely."
  useEffect(() => {
    if (!selectedImage) return;
    function handlePointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (toolbarRef.current?.contains(target)) return;
      setSelectedImage(null);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [selectedImage]);

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
      const uploaded = await uploadMediaSafe(formData);
      if (!uploaded.ok) {
        setImageError(uploaded.error);
        return;
      }
      const resolved = await getMediaAssetAction(uploaded.data.id);
      if (!resolved.ok || !resolved.data.image) {
        setImageError("Gambar berhasil diunggah, tetapi URL-nya gagal diambil. Coba lagi.");
        return;
      }
      if (!quill) return;
      if (range.length > 0) quill.deleteText(range.index, range.length, "user");
      insertImageAsOwnLine(quill, range.index, resolved.data.image.url, resolved.data.image.alt ?? "", {
        width: String(resolved.data.image.width),
        height: String(resolved.data.image.height),
      });
    });
  }

  /** Naik/Turun: swaps the selected image with the paragraph immediately
   *  above/below it. Pulls the image (and, if it had the line to itself,
   *  that now-empty line) out first, then drops it back in via the same
   *  insertImageAsOwnLine() a fresh insert uses — re-querying the
   *  neighboring line's live blot for position rather than computing the
   *  post-delete offset by hand. */
  function moveSelectedImage(direction: "up" | "down") {
    const quill = quillRef.current;
    if (!quill || !selectedImage) return;
    const { index } = selectedImage;
    const domNode = quill.getLeaf(index)[0]?.domNode;
    if (!(domNode instanceof HTMLImageElement)) return;
    const src = domNode.getAttribute("src");
    if (!src) return;
    const alt = domNode.getAttribute("alt") ?? "";
    // Carried through the move so width/height (see ImageDims) survive it
    // too — otherwise a moved image would lose its aspect-ratio hint.
    const dims: ImageDims = {
      width: domNode.getAttribute("width") ?? undefined,
      height: domNode.getAttribute("height") ?? undefined,
    };

    const [line] = quill.getLine(index);
    const neighbor = direction === "up" ? line?.prev : line?.next;
    if (!line || !neighbor) return; // already the first/last block — nothing to swap with

    const imageOnlyLine = line.length() === 2; // the embed (1) plus its own trailing "\n" (1)
    quill.deleteText(index, imageOnlyLine ? 2 : 1, "user");

    const at = direction === "up" ? quill.getIndex(neighbor) : quill.getIndex(neighbor) + neighbor.length();
    const newIndex = insertImageAsOwnLine(quill, at, src, alt, dims);
    setSelectedImage({ index: newIndex, alt });
  }

  function deleteSelectedImage() {
    const quill = quillRef.current;
    if (!quill || !selectedImage) return;
    const [line] = quill.getLine(selectedImage.index);
    const imageOnlyLine = line ? line.length() === 2 : false;
    // Same cleanup as moveSelectedImage: drop the now-empty line along
    // with the image so deleting doesn't leave a blank paragraph behind.
    quill.deleteText(selectedImage.index, imageOnlyLine ? 2 : 1, "user");
    setSelectedImage(null);
  }

  function updateSelectedImageAlt(alt: string) {
    const quill = quillRef.current;
    if (!quill || !selectedImage) return;
    quill.formatText(selectedImage.index, 1, { alt }, "user");
    setSelectedImage({ ...selectedImage, alt });
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
      quillCtorRef.current = QuillCtor;

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

      // Placement UI is only wired up for allowImages callers — every
      // other caller's sanitizer allow-list can't even persist an <img>,
      // so there's nothing for it to select.
      if (allowImages) {
        // Clicking an <img> selects it as a length-1 range (Quill doesn't
        // do this on its own for a plain inline embed) so both the visual
        // selection highlight and the selection-change handler below —
        // the single source of truth for `selectedImage` — pick it up.
        quill.root.addEventListener("click", (e) => {
          const target = e.target;
          if (!(target instanceof HTMLImageElement)) return;
          const QuillClass = quillCtorRef.current;
          if (!QuillClass) return;
          // Quill.find()'s return type includes the Quill instance itself
          // (its `bubble` overload can walk up to the editor root) even
          // though that can't actually happen for a leaf <img> node —
          // excluding it is enough for TS to narrow the rest to Blot.
          const blot = QuillClass.find(target);
          if (!blot || blot instanceof QuillClass) return;
          quill.setSelection(quill.getIndex(blot), 1, "user");
        });

        quill.on("selection-change", (range) => {
          if (range && range.length === 1) {
            const domNode = quill.getLeaf(range.index)[0]?.domNode;
            if (domNode instanceof HTMLImageElement) {
              setSelectedImage({ index: range.index, alt: domNode.getAttribute("alt") ?? "" });
              return;
            }
          }
          // A real selection inside the editor that isn't a single image
          // (plain text, a multi-char selection) — deselect. `range ===
          // null` (focus merely left the editor) is deliberately left
          // alone here; see the click-outside effect for why.
          if (range) setSelectedImage(null);
        });
      }
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
          {/* Advisory-hint convention: lib/page-images/shared.ts's doc
              comment on PageImageSlotMeta.imageGuidance defines the three
              wordings (tampil utuh / rasio tetap / pita lebar penuh) every
              hint in the admin should pick from — this is category 1
              (tampil utuh): .prose-artikel img scales the WHOLE image at
              width:100% regardless of its shape, nothing here ever crops
              it, so recommending "(rasio 16:9)" used to invent a
              constraint that doesn't exist. 800px isn't arbitrary though:
              it's this purpose's own upload ladder
              (ImageProcessorService's PURPOSE_SPECS[COVER].widths =
              [400, 800]) — the backend never generates or serves a variant
              wider than 800px for this purpose no matter how large the
              source is, so that's the real ceiling worth uploading at. */}
          <p className="mt-1.5 text-xs text-muted-foreground">
            Disarankan lebar 800 px — gambar tampil utuh, tidak dipotong, jadi rasionya bebas. Lebih besar dari 800
            px tidak menambah ketajaman. Format JPG, PNG, atau WebP, maksimal 4 MB.
          </p>
          {imagePending && <p className="mt-1.5 text-xs text-muted-foreground">Mengunggah gambar…</p>}
          {imageError && (
            <p role="alert" className="mt-1.5 text-sm text-destructive">
              {imageError}
            </p>
          )}
          {selectedImage && (
            <div
              ref={toolbarRef}
              // Keyboard-tab-away counterpart to the click-outside effect
              // above: only clears when focus actually leaves this whole
              // group, not when it moves from the input to one of the
              // buttons below (both inside `currentTarget`).
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                  setSelectedImage(null);
                }
              }}
              className="mt-2 flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted/40 p-2"
            >
              <span className="shrink-0 text-xs text-muted-foreground">Gambar dipilih</span>
              <Input
                value={selectedImage.alt}
                onChange={(e) => updateSelectedImageAlt(e.target.value)}
                placeholder="Teks alternatif"
                className="h-8 min-w-40 flex-1 text-xs"
              />
              {/* preventDefault on mousedown (same trick Quill's own
                  toolbar uses — see handleImageButton's doc comment) so
                  clicking these never shifts focus off the editor/input in
                  the first place. */}
              <Button
                type="button"
                variant="outlineSecondary"
                size="sm"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => moveSelectedImage("up")}
              >
                <ArrowUp className="size-3.5" />
                Naik
              </Button>
              <Button
                type="button"
                variant="outlineSecondary"
                size="sm"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => moveSelectedImage("down")}
              >
                <ArrowDown className="size-3.5" />
                Turun
              </Button>
              <Button
                type="button"
                variant="outlineSecondary"
                size="sm"
                onMouseDown={(e) => e.preventDefault()}
                onClick={deleteSelectedImage}
              >
                <X className="size-3.5" />
                Hapus
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
