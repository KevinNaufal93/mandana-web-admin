import Image from "next/image";
import { ImageOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ContentBlockTypeDef } from "@/lib/content-blocks/types";

/**
 * Deliberately narrower than AdminContentBlock: this is also fed live,
 * in-progress state from <ContentBlockForm> (no id/createdAt yet on
 * create, and `image` may be a fresh <ImagePicker> blob: preview rather
 * than a saved asset).
 */
export interface ContentBlockPreviewData {
  title: string;
  subtitle: string | null;
  ctaText: string | null;
  isActive: boolean;
  /** See ContentBlockTypeDef.supportsImageOnly's doc comment. When true,
   *  the card renders image-only, matching what the public site actually
   *  does. */
  imageOnly: boolean;
  image: { url: string; alt: string | null } | null;
}

/**
 * Renders one block the way the public site actually shows it — a hero
 * slide's dark-overlay title card, a service-strip card, or a promo card
 * from the property detail sidebar — instead of a generic table row. Used
 * in three places: <ContentBlockList>'s rows, and the live preview panel
 * on both the create and edit forms, so "what you're editing" and "what
 * visitors will see" are the same pixels.
 *
 * No "use client"/async here on purpose: a plain sync component composes
 * into both the (server) list page and the (client) form tree, same as
 * <DetailCard>/<Badge> already do elsewhere in this app.
 */
export function ContentBlockPreview({
  typeDef,
  data,
  className,
}: {
  typeDef: ContentBlockTypeDef;
  data: ContentBlockPreviewData;
  className?: string;
}) {
  switch (typeDef.layout) {
    case "stack":
      return <HeroPreview data={data} className={className} />;
    case "grid":
      return <ServiceCardPreview data={data} className={className} />;
    case "sidebar":
      return <PromoCardPreview data={data} className={className} />;
  }
}

function InactiveBadge({ isActive }: { isActive: boolean }) {
  if (isActive) return null;
  // z-10 is load-bearing: every sibling layer below (image/gradient/text)
  // is `absolute` with no z-index of its own, so without this the badge —
  // despite being first in the tree — would paint UNDER them. See CSS
  // stacking order: positioned descendants with z-index:auto stack in
  // DOM order among themselves, but always below one with a positive
  // z-index, regardless of DOM order.
  return (
    <Badge variant="secondary" className="absolute right-3 top-3 z-10">
      Nonaktif
    </Badge>
  );
}

function PreviewImage({
  image,
  alt,
  fit,
}: {
  image: { url: string; alt: string | null } | null;
  alt: string;
  /** "contain" letterboxes on the container's own background instead of
   *  cropping — right for a hero photo (see HeroPreview's own comment on
   *  why it uses this too) and for a service-card illustration, whose
   *  aspect ratio and composition (often with a headline baked into the
   *  graphic itself) can't survive an arbitrary crop the way a photo can.
   *  "cover" crops to fill — right for a promo card, which the public
   *  component (mandana-web's promo-card.tsx) always renders with
   *  object-cover. */
  fit: "cover" | "contain";
}) {
  if (!image) {
    return (
      <div className="flex h-full w-full items-center justify-center text-muted-foreground/70">
        <ImageOff className="size-8" />
      </div>
    );
  }
  return (
    <Image
      src={image.url}
      alt={image.alt ?? alt}
      fill
      className={fit === "cover" ? "object-cover" : "object-contain"}
      sizes="(min-width: 1024px) 640px, 100vw"
      // A live form preview can be a blob: object URL fresh off
      // <ImagePicker> — Next's loader can't fetch/optimize that, same
      // rationale as image-picker.tsx itself.
      unoptimized={image.url.startsWith("blob:")}
    />
  );
}

function HeroPreview({ data, className }: { data: ContentBlockPreviewData; className?: string }) {
  return (
    <div
      className={cn(
        "relative aspect-video w-full overflow-hidden rounded-lg transition-opacity",
        // bg-primary, not bg-muted, whenever there's a photo to show: "contain"
        // below means the photo doesn't necessarily fill the box, and this is
        // what shows through the gap — matching mandana-web's actual <section
        // bg-primary> (components/sections/hero.tsx), the same reasoning
        // PreviewImage's fit prop follows the real public hero for. Only the
        // true empty state (no image at all) keeps the neutral bg-muted the
        // ImageOff icon below was styled for.
        data.image ? "bg-primary" : "bg-muted",
        !data.isActive && "opacity-50",
        className,
      )}
    >
      <InactiveBadge isActive={data.isActive} />
      {/* "contain": a full crop can trim off part of the building/composition
          an admin specifically chose — see mandana-web/components/sections/
          hero.tsx, which now fits its admin-driven slides the same way. */}
      <PreviewImage image={data.image} alt={data.title} fit="contain" />
      {/* Image-only: the artwork already has the title/subtitle baked in,
          so skip the dark-gradient text overlay entirely and show a plain
          full-bleed image — mirrors ServiceCardPreview's imageOnly branch.
          NOTE: this reflects the intended public behavior once the
          backend/public hero component honor this flag for hero rows —
          see ContentBlockTypeDef.supportsImageOnly's doc comment. */}
      {!data.imageOnly && (
        <>
          {/* Left-to-right dark-to-transparent treatment matching the public
              hero (see the client screenshot in the integration doc) — text
              sits over the deep-green side, the image breathes on the right. */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/85 via-primary/35 to-transparent" />
          <div className="absolute inset-0 flex flex-col justify-center gap-2 px-6 sm:px-10">
            <h3 className="max-w-md font-serif text-xl font-medium leading-tight text-card sm:text-3xl">
              {data.title || "Judul slide"}
            </h3>
            {data.subtitle && <p className="max-w-sm text-xs text-card/85 sm:text-sm">{data.subtitle}</p>}
            {data.ctaText && (
              <span className="mt-2 inline-flex w-fit items-center rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-accent-foreground">
                {data.ctaText}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ServiceCardPreview({ data, className }: { data: ContentBlockPreviewData; className?: string }) {
  return (
    <div
      className={cn(
        "relative flex flex-col gap-3 overflow-hidden rounded-lg bg-card p-4 shadow-sm transition-opacity",
        !data.isActive && "opacity-50",
        className,
      )}
    >
      <InactiveBadge isActive={data.isActive} />
      {/* Image-only: the artwork already has the title/description baked
          in, so the public site skips this text layer entirely — mirror
          that here rather than showing text visitors will never see. */}
      {!data.imageOnly && (
        <div>
          <h3 className="font-semibold text-primary">{data.title || "Judul kartu"}</h3>
          {data.subtitle && <p className="mt-1 text-sm text-muted-foreground">{data.subtitle}</p>}
        </div>
      )}
      <div className="relative mt-auto aspect-[4/3] w-full overflow-hidden rounded-md bg-muted">
        <PreviewImage image={data.image} alt={data.title} fit="contain" />
      </div>
    </div>
  );
}

/**
 * Mirrors mandana-web/components/property/detail/promo-card.tsx pixel for
 * pixel — same shell classes, same font-serif title, same accent button —
 * so the admin's live preview is the property-detail sidebar card, not an
 * approximation of it. Two differences from the public component are
 * deliberate admin-only chrome, not visual drift: `relative` on the shell
 * (to host <InactiveBadge>) and a `max-w-[380px]` cap (the public card's
 * own `sizes` hint — "(min-width: 1024px) 380px" — is what the real
 * sidebar column constrains it to; without the cap this panel would
 * stretch to fill whatever width the surrounding form grid gives it).
 */
function PromoCardPreview({ data, className }: { data: ContentBlockPreviewData; className?: string }) {
  const hasCta = Boolean(data.ctaText);

  if (data.imageOnly) {
    return (
      <div
        className={cn(
          "relative max-w-[380px] overflow-hidden rounded-xl border border-border transition-opacity",
          !data.isActive && "opacity-50",
          className,
        )}
      >
        <InactiveBadge isActive={data.isActive} />
        <div className="relative aspect-video w-full bg-muted">
          <PreviewImage image={data.image} alt={data.title} fit="cover" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative flex max-w-[380px] flex-col gap-4 rounded-xl border border-border bg-card p-5 transition-opacity",
        !data.isActive && "opacity-50",
        className,
      )}
    >
      <InactiveBadge isActive={data.isActive} />
      {data.image && (
        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
          <PreviewImage image={data.image} alt={data.title} fit="cover" />
        </div>
      )}
      <h3 className="font-serif text-base font-bold text-primary">{data.title || "Judul kartu promo"}</h3>
      {data.subtitle && <p className="text-sm text-primary">{data.subtitle}</p>}
      {hasCta && (
        <Button variant="accent" className="w-fit" disabled>
          {data.ctaText}
        </Button>
      )}
    </div>
  );
}
