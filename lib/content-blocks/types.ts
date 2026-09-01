import type { MediaPurpose } from "@/lib/api/media";

/**
 * Single source of truth for what a content-block "type" is on this side.
 * The API's `type` enum (`hero | service_card`) is closed — adding a type
 * there is still a backend change — but every route, tab, form and preview
 * in this module reads this list instead of hardcoding either value, so
 * wiring up a third type once the backend adds one is a single new entry
 * here, not a new module. See docs/content-blocks-admin-integration.md.
 */
export interface ContentBlockTypeDef {
  /** The API's `type` value — sent as-is in create/update bodies. */
  type: "hero" | "service_card";
  /** URL segment under /content-media/[type]. */
  slug: string;
  /** Tab label + page heading. */
  label: string;
  /** One-line explainer under the heading. */
  description: string;
  /** Passed to <ImagePicker purpose=...> — determines which responsive
   *  widths the API generates for this type's uploads. */
  mediaPurpose: MediaPurpose;
  /** Hero: a block with no image is rejected by the API (400) — see the
   *  integration doc §4. Service card: image is optional. */
  requiresImage: boolean;
  /** Hero-only field — service cards ignore ctaText entirely (doc §2). */
  usesCtaText: boolean;
  /** Same underlying `subtitle` field on the API — "the slide's secondary
   *  line" for a hero, "its description" for a service card (doc §2). */
  subtitleLabel: string;
  /** Same underlying `link` field on the API; label/placeholder differ by
   *  type (CTA target for hero, card href for service cards). */
  linkLabel: string;
  linkPlaceholder: string;
  /** Which arrangement <ContentBlockList>/<ContentBlockPreview> render:
   *  a vertical carousel stack, or a card grid. */
  layout: "stack" | "grid";
}

export const CONTENT_BLOCK_TYPES: ContentBlockTypeDef[] = [
  {
    type: "hero",
    slug: "hero",
    label: "Hero Carousel",
    description: "Slide besar di bagian atas homepage.",
    mediaPurpose: "hero",
    requiresImage: true,
    usesCtaText: true,
    subtitleLabel: "Subjudul",
    linkLabel: "Target CTA",
    linkPlaceholder: "/properties?listingType=sale",
    layout: "stack",
  },
  {
    type: "service_card",
    slug: "service-cards",
    label: "Service Strip",
    description: "Kartu layanan di bawah hero homepage.",
    mediaPurpose: "cover",
    requiresImage: false,
    usesCtaText: false,
    subtitleLabel: "Deskripsi",
    linkLabel: "Tautan kartu",
    linkPlaceholder: "/moving",
    layout: "grid",
  },
];

export function findTypeBySlug(slug: string): ContentBlockTypeDef | undefined {
  return CONTENT_BLOCK_TYPES.find((t) => t.slug === slug);
}

export function findTypeByValue(type: string): ContentBlockTypeDef | undefined {
  return CONTENT_BLOCK_TYPES.find((t) => t.type === type);
}
