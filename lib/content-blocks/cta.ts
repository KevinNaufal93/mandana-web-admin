/**
 * How a content block's CTA (`ctaText` + `link`) resolves into what the
 * public site actually renders. Keep this in sync with mandana-web's
 * `lib/cta.ts` — same three-way rule, same shape, deliberately duplicated
 * across repos rather than shared as a package (see that file's header).
 *
 * The rule (after trimming both strings):
 * - No `link` → nothing is clickable, no button (`kind: "none"`).
 * - `link` set, and (no `ctaText` OR the block isn't in "text mode") →
 *   the whole slide/card is clickable (`kind: "whole"`).
 * - `link` and `ctaText` both set, and the block IS in "text mode" →
 *   a button carries the link; the image itself is not clickable
 *   (`kind: "button"`).
 *
 * "Text mode" is the caller's job to compute and pass as `buttonAllowed`:
 * for a hero slide it's `hasOverlay(slide)` (mandana-web's hero.tsx), for
 * a promo card it's `!card.imageOnly` (mandana-web's promo-card.tsx). This
 * module only combines that with the two text fields — it knows nothing
 * about `imageOnly` itself, so it works for any future content-block type
 * with the same shape.
 */
export type ResolvedCta =
  | { kind: "none" }
  | { kind: "whole"; href: string }
  | { kind: "button"; href: string; text: string };

export function resolveCta({
  ctaText,
  ctaLink,
  buttonAllowed,
}: {
  ctaText?: string | null;
  ctaLink?: string | null;
  buttonAllowed: boolean;
}): ResolvedCta {
  const href = ctaLink?.trim();
  if (!href) return { kind: "none" };
  const text = ctaText?.trim();
  return buttonAllowed && text ? { kind: "button", href, text } : { kind: "whole", href };
}
