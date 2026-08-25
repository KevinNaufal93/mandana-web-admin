import { cn } from "@/lib/utils";

/**
 * Renders the admin-authored rich text as-is. Safe: mandana-api sanitizes
 * every description through an allow-listed tag/attribute set
 * (RICH_TEXT_SANITIZE_OPTIONS — no scripts, no data: URIs) before it's
 * ever persisted, so what comes back over the wire is already clean HTML.
 *
 * No typography plugin installed (see lib/logger.ts's "hand-rolled over
 * library" convention) — the small prose ruleset below covers the tags
 * the Quill editor actually emits (see the API's allow-list).
 */
export function RichTextView({ html }: { html: string | null }) {
  if (!html) return <p className="text-sm text-muted-foreground">Belum ada deskripsi.</p>;

  return (
    <div
      className={cn(
        "text-sm leading-relaxed text-primary",
        "[&_p]:mb-3 [&_p:last-child]:mb-0",
        "[&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5",
        "[&_h1]:mb-2 [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-semibold",
        "[&_h3]:mb-2 [&_h3]:text-sm [&_h3]:font-semibold",
        "[&_a]:text-primary [&_a]:underline",
        "[&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:italic",
        "[&_img]:my-3 [&_img]:rounded-md [&_img]:max-w-full",
        "[&_hr]:my-4 [&_hr]:border-border",
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
