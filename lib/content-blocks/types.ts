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
  /** Optional one-line upload spec shown under the <ImagePicker> label —
   *  recommended dimensions, format and max file size for this type's
   *  artwork. Advisory only; nothing here is enforced client-side. Which
   *  of the three wordings to use (tampil utuh / rasio tetap / pita lebar
   *  penuh) is defined once, in lib/page-images/shared.ts's own doc
   *  comment on `PageImageSlotMeta.imageGuidance` — follow it rather than
   *  inventing a new phrasing here. */
  imageGuidance?: string;
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
  /** Hero only — whether this type gets a second <ImagePicker> for a
   *  mobile-optimized crop, swapped in by the public site below ~1024px
   *  viewport width (see hero-mobile-image-requirements.md). Upload
   *  purpose is always "hero_mobile" when true. Setting
   *  mobileMediaAssetId on any other type is a 400, so the form only
   *  renders the second picker when this is `true`. Still optional on hero,
   *  but no longer without effect: the public hero shows only the slides
   *  that have one below 1024px, so a slide without it is desktop-only. The
   *  primary image renders at every width only while NO slide in the
   *  carousel has a mobile image. */
  supportsMobileImage: boolean;
  /** Advisory hint shown under the mobile-image picker, mirroring
   *  imageGuidance's role for the primary image. Only meaningful when
   *  supportsMobileImage is true. */
  mobileImageGuidance?: string;
}

export const CONTENT_BLOCK_TYPES: ContentBlockTypeDef[] = [
  {
    type: "hero",
    slug: "hero",
    label: "Hero Carousel",
    description: "Slide besar di bagian atas homepage.",
    mediaPurpose: "hero",
    // The public hero band is locked to this ratio at lg+ (hero.tsx's
    // DESKTOP_ASPECT — keep the two in sync). At 2.8:1 the header (96px) +
    // band + search card (178px, overlapping the band by 32px) exactly fill a
    // 1512×784 viewport (1920×1080 at 125% Windows scaling), so the card
    // always sits at the bottom of the first screen. An upload in another
    // ratio is never cropped; it is shown whole inside the band, with the
    // hero's dark green beside it or above and below it.
    imageGuidance:
      "Disarankan 2520 × 900 px (rasio 2,8:1). Gambar selalu tampil utuh, tidak dipotong. " +
      "Gambar dengan rasio lain tetap tampil penuh, tetapi akan muncul ruang hijau di sisinya atau di atas-bawahnya. " +
      "Format JPG, PNG, atau WebP, maksimal 4 MB.",
    requiresImage: true,
    usesCtaText: true,
    subtitleLabel: "Subjudul",
    linkLabel: "Target CTA",
    linkPlaceholder: "/properties?listingType=sale",
    layout: "stack",
    supportsImageOnly: true,
    supportsListingTypeScope: false,
    supportsMobileImage: true,
    // No single fixed ratio here on purpose — see
    // docs/hero-mobile-image-requirements.md §1: a hero photo's best mobile
    // crop depends on where its own subject sits, verified there against a
    // real photo (one object-position anchor did NOT survive being applied
    // to a second, differently-composed one). What IS fixed regardless of
    // composition: the upload ladder (PURPOSE_SPECS[HERO_MOBILE].widths =
    // [480, 768, 1080], image-processor.service.ts) tops out at 1080px, and
    // format/max size are the same for every photo.
    mobileImageGuidance:
      "Portrait atau mendekati persegi, sesuaikan komposisi foto — rasio tetap fleksibel per foto. " +
      "Lebar sumber minimal 1080px, ditampilkan di bawah lebar 1024px. " +
      "Slide tanpa gambar mobile tidak ikut tampil di layar kecil, kecuali jika tidak ada satu pun slide yang punya gambar mobile. " +
      "Format JPG, PNG, atau WebP, maksimal 4 MB.",
  },
  {
    type: "service_card",
    slug: "service-cards",
    label: "Service Strip",
    description: "Kartu layanan di bawah hero homepage.",
    mediaPurpose: "cover",
    // Category 2 (rasio tetap) — box is aspect-[253/246] ≈ 1.03:1, so
    // 760×740 is already an exact match.
    imageGuidance:
      "Disarankan 760 × 740 px (hampir persegi). Bingkainya tetap di rasio itu — gambar dengan rasio lain " +
      "dipotong di bagian tengah agar pas. Format PNG (untuk latar transparan) atau WebP, maksimal 4 MB.",
    requiresImage: false,
    usesCtaText: false,
    subtitleLabel: "Deskripsi",
    linkLabel: "Tautan kartu",
    linkPlaceholder: "/moving",
    layout: "grid",
    supportsImageOnly: true,
    supportsListingTypeScope: false,
    supportsMobileImage: false,
  },
  {
    type: "property_promo",
    slug: "promo-cards",
    label: "Promo Cards",
    description: "Kartu promo di sidebar halaman detail properti, di bawah kartu agen.",
    // Promo images come back with srcsetAvif: "" (doc §5/§3) — same
    // cover-purpose treatment as service-card icons, not hero.
    mediaPurpose: "cover",
    // No fixed ratio to recommend, unlike every other type here — the
    // public PromoCard component deliberately sizes its box to whatever
    // ratio is uploaded (`aspectRatioOf()` in
    // mandana-web/components/property/detail/promo-card.tsx), specifically
    // because "the first real one shipped square, 1024×1024, which a
    // hardcoded aspect-video cropped top/bottom." Width is still worth
    // stating: the card never renders wider than 380px.
    // Category 1 (tampil utuh) — the only slot where this is the box's
    // own design, not a fixed shape imitating it: see aspectRatioOf() in
    // the component this feeds.
    imageGuidance:
      "Gambar selalu tampil utuh, tidak dipotong — kartu menyesuaikan proporsi gambar yang diunggah (persegi, " +
      "potret, atau lanskap semua bisa). Lebar 400–800px sudah cukup (kartu tampil maksimal 380px). Format JPG, " +
      "PNG, atau WebP, maksimal 4 MB.",
    requiresImage: false,
    usesCtaText: true,
    subtitleLabel: "Isi kartu",
    linkLabel: "Target CTA",
    linkPlaceholder: "https://wa.me/628123456789",
    layout: "sidebar",
    supportsImageOnly: true,
    supportsListingTypeScope: true,
    supportsMobileImage: false,
  },
];

export function findTypeBySlug(slug: string): ContentBlockTypeDef | undefined {
  return CONTENT_BLOCK_TYPES.find((t) => t.slug === slug);
}

export function findTypeByValue(type: string): ContentBlockTypeDef | undefined {
  return CONTENT_BLOCK_TYPES.find((t) => t.type === type);
}
