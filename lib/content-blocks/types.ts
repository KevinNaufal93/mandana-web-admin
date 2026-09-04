import type { MediaPurpose } from "@/lib/api/media";
import type { ContentBlockType } from "@/lib/api/content-blocks";

/**
 * Single source of truth for what a content-block "type" is on this side.
 * The API's `type` enum (`hero | service_card | property_promo`) is
 * closed — adding a type there is still a backend change — but every
 * route, tab, form and preview in this module reads this list instead of
 * hardcoding any of the values, so wiring up a new type once the backend
 * adds one is a single new entry here, not a new module. See
 * docs/content-blocks-admin-integration.md.
 */
export interface ContentBlockTypeDef {
  /** The API's `type` value — sent as-is in create/update bodies. */
  type: ContentBlockType;
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
   *  integration doc §4. Service card / promo card: image is optional. */
  requiresImage: boolean;
  /** Hero and promo cards use ctaText — service cards ignore it entirely
   *  (doc §2). */
  usesCtaText: boolean;
  /** Same underlying `subtitle` field on the API — "the slide's secondary
   *  line" for a hero, "its description" for a service card, "its body
   *  copy" for a promo card (doc §2). */
  subtitleLabel: string;
  /** Same underlying `link` field on the API; label/placeholder differ by
   *  type (CTA target for hero/promo, card href for service cards). */
  linkLabel: string;
  linkPlaceholder: string;
  /** Which arrangement <ContentBlockList>/<ContentBlockPreview> render:
   *  a vertical carousel stack, a card grid, or a narrow sidebar card. */
  layout: "stack" | "grid" | "sidebar";
  /** Whether this type can be flagged `imageOnly` — the public site then
   *  renders just the image (its artwork already has the title/description
   *  baked in) and skips the text overlay.
   *
   *  Hero: as of this admin module's build, the deployed API's
   *  `imageOnly` field is documented as unused/always-`false` for hero
   *  rows, and the public hero component always renders the dark-gradient
   *  title/subtitle overlay — see docs/content-blocks-admin-integration.md
   *  §2. Flagging it `true` here so admins CAN set image-only slides is
   *  the admin-panel half of the change; it has no visible effect on the
   *  public homepage until the backend persists/honors this field for
   *  `type: "hero"` and the public hero component is updated to skip its
   *  text overlay when set. Track that as a follow-up outside this repo.
   *
   *  Service card and promo card: the public site already honors this
   *  today (ServiceDto and the promo `PromoCard` component both skip
   *  their text overlay when `imageOnly` is set). */
  supportsImageOnly: boolean;
  /** Only `property_promo` supports this — an optional array of listing
   *  types (`ListingType[]`) restricting the card to Dijual/Disewa/
   *  Properti Baru; empty/null means every listing type (doc §4b).
   *  Setting a non-empty scope on any other type is a 400, so the form
   *  only renders the control when this is `true`. */
  supportsListingTypeScope: boolean;
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
    supportsImageOnly: true,
    supportsListingTypeScope: false,
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
    supportsImageOnly: true,
    supportsListingTypeScope: false,
  },
  {
    type: "property_promo",
    slug: "promo-cards",
    label: "Promo Cards",
    description: "Kartu promo di sidebar halaman detail properti, di bawah kartu agen.",
    // Promo images come back with srcsetAvif: "" (doc §5/§3) — same
    // cover-purpose treatment as service-card icons, not hero.
    mediaPurpose: "cover",
    requiresImage: false,
    usesCtaText: true,
    subtitleLabel: "Isi kartu",
    linkLabel: "Target CTA",
    linkPlaceholder: "https://wa.me/628123456789",
    layout: "sidebar",
    supportsImageOnly: true,
    supportsListingTypeScope: true,
  },
];

export function findTypeBySlug(slug: string): ContentBlockTypeDef | undefined {
  return CONTENT_BLOCK_TYPES.find((t) => t.slug === slug);
}

export function findTypeByValue(type: string): ContentBlockTypeDef | undefined {
  return CONTENT_BLOCK_TYPES.find((t) => t.type === type);
}
