"use client";

import { useEffect, useRef } from "react";
import type Quill from "quill";
import "quill/dist/quill.snow.css";
import { cn } from "@/lib/utils";

export interface RichTextEditorProps {
  /** Initial HTML only — Quill owns the DOM after mount. See the mount
   *  effect below for why this isn't kept in sync on every render. */
  defaultValue: string;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
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
}: RichTextEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<Quill | null>(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

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
          toolbar: [
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
    </div>
  );
}
