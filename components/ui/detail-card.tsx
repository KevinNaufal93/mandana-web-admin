import { cn } from "@/lib/utils";

/**
 * tone communicates what KIND of section this is, not just its content —
 * the property detail redesign uses this to tell three transaction models
 * apart at a glance: "default" (view-only content with nothing else going
 * on), "readonly" (sitting inside an edit flow where its siblings ARE
 * editable, but this one specifically isn't — e.g. an assigned agent, which
 * isn't part of the update payload), and "danger" (a destructive action,
 * matching the treatment event-support's item detail view already
 * established for its own danger zone). "readonly" and "danger" are meant
 * to be applied situationally (e.g. only while a page is in edit mode), not
 * as a permanent property of a card.
 */
type DetailCardTone = "default" | "readonly" | "danger";

const TONE_BORDER: Record<DetailCardTone, string> = {
  // bg-card so the card is a genuine elevated panel (same token the login
  // card and the Select/DropdownMenu popovers already use) rather than
  // relying on the page's own bg-background showing through — a card with
  // no fill of its own was why an Input inside it (also bg-background)
  // used to read as the exact same surface as its container. readonly
  // stays on bg-muted/40 (dimmer, not white) so it still visibly recedes
  // next to its now-brighter editable siblings.
  default: "border-border bg-card",
  readonly: "border-border/60 bg-muted/40",
  danger: "border-destructive/30 bg-card",
};

export function DetailCard({
  title,
  children,
  className,
  tone = "default",
  action,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  tone?: DetailCardTone;
  /** Rendered top-right of the header, next to the title — e.g. a small
   *  lock icon marking a readonly card, or (once a delete endpoint exists)
   *  a delete button on a danger card. Absent by default, so every
   *  existing caller is unaffected. */
  action?: React.ReactNode;
}) {
  return (
    <section className={cn("rounded-lg border p-4", TONE_BORDER[tone], className)}>
      <div className="flex items-center justify-between gap-2">
        <h2 className={cn("text-sm font-semibold", tone === "danger" ? "text-destructive" : "text-primary")}>
          {title}
        </h2>
        {action}
      </div>
      <div className="mt-3 flex flex-col gap-2.5">{children}</div>
    </section>
  );
}

export function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-primary">{value}</span>
    </div>
  );
}
