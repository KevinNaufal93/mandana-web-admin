import type { MediaPurpose } from "@/lib/api/media";

/**
 * Client-safe page-image registry, split out of lib/api/page-images.ts for
 * the same reason lib/seo/shared.ts is: that file is `import "server-only"`,
 * so a client component (page-images-form.tsx) needing this registry's
 * runtime values — not just its types — cannot import it from there
 * without pulling serverApi() into the client bundle, which Next correctly
 * refuses to build.
 *
 * Every `imageGuidance`/`mobileImageGuidance` string in this file (and in
 * lib/content-blocks/types.ts, and every inline `hint=` prop across the
 * admin) is derived from the actual measured render box on the public
 * page, plus the app-wide "maksimal 4 MB" (see MAX_UPLOAD_BYTES in
 * lib/media/prepare-upload.ts) — never enforced client-side, always
 * advisory. Three render-box shapes exist, and every hint states which one
 * applies, because a bare "Disarankan W × H px (rasio R)" reads as a
 * no-crop promise regardless of which is true:
 *
 * 1. **Tampil utuh** — the box takes its shape from the uploaded image
 *    (an inline `style={{aspectRatio}}`, or a section locked to one fixed
 *    ratio and rendered with `object-contain`). Nothing is ever cropped;
 *    an off-ratio upload instead leaves empty space (bg-primary strips)
 *    beside or above/below it. Say "tampil utuh, tidak dipotong" and name
 *    that cost.
 * 2. **Rasio tetap** — a fixed `aspect-[…]` box with `object-cover`. State
 *    the ratio *and* that an off-ratio upload is center-cropped to it —
 *    "gambar dengan rasio lain dipotong di bagian tengah agar pas". This
 *    is the case a bare "(rasio R)" most easily gets mistaken for
 *    category 1.
 * 3. **Pita lebar penuh** — full-bleed, fixed height, fluid width. The
 *    box's *shape* is `viewport width ÷ that fixed height`, so it changes
 *    on every screen and no single image ratio can fit all of them — this
 *    is always cropped, by a different amount at every width. Say so
 *    explicitly, then give the safe zone: the region of the image
 *    guaranteed visible across every supported viewport (computed from the
 *    section's real height classes and object-position, not eyeballed),
 *    and where to place the subject. Only `about_hero` and
 *    `home_property_valuation` are left in this category below `lg`
 *    (1024px) — both also support a separate `mobileImage`, which removes
 *    the crop entirely below `lg` once one is uploaded.
 */

export interface PageImageSlotMeta {
  /** Matches the API's PageImageSlot enum value — sent as-is in the URL. */
  key: string;
  /** Label shown next to this slot's picker. */
  label: string;
  /** Passed to <ImagePicker purpose=...>. */
  mediaPurpose: MediaPurpose;
  /** Shown as the picker's advisory hint — see this file's own doc comment
   *  for the three-category convention every string here follows. */
  imageGuidance: string;
  /** Whether this slot renders a second <ImagePicker> for a mobile-only
   *  (<1024px) image, mirroring content-blocks' hero
   *  `supportsMobileImage` — true only for the two full-bleed
   *  fixed-height ("pita lebar penuh") slots. Upload purpose is always
   *  "hero_mobile" when true; the API 400s if sent on any other slot. */
  supportsMobileImage?: boolean;
  /** Hint shown under the mobile picker, mirroring `imageGuidance`'s role
   *  for the primary image. Only meaningful when supportsMobileImage. */
  mobileImageGuidance?: string;
}

export interface PageImagePageMeta {
  /** URL segment under /content-media/[slug] — a static route, so it
   *  takes precedence over the sibling /content-media/[type] dynamic
   *  route for content blocks. */
  slug: string;
  /** Tab label + page heading. */
  label: string;
  /** Site-relative path, for reference only. */
  path: string;
  slots: PageImageSlotMeta[];
}

// Both help-CTA slots render the exact same <HelpCta> component on two
// different pages (mandana-web/components/sections/help-cta.tsx) — same
// aspect-[3/2] box, same glass-panel overlap — so the same guidance is
// correct, not just similar. One literal so the two copies can't drift
// apart by accident the way they had (byte-identical strings maintained by
// hand in two places) before this file was audited.
const HELP_CTA_GUIDANCE =
  "Disarankan 1920 × 1280 px (rasio 3:2). Bingkainya tetap 3:2 di semua ukuran layar — gambar dengan rasio " +
  "lain dipotong di bagian tengah agar pas. Panel kaca menutupi sisi kiri foto di layar lebar (tepi bawah di " +
  "layar kecil) — hindari foto yang sangat terang di area itu. Format JPG, PNG, atau WebP, maksimal 4 MB.";

const MOBILE_IMAGE_GUIDANCE =
  "Foto khusus layar kecil (di bawah 1024 px) — potret atau mendekati persegi, lebar minimal 1080 px. " +
  "Gambar tampil utuh, tidak dipotong; tinggi bingkainya mengikuti rasio foto ini. Kosongkan jika ingin " +
  "memakai gambar utama (akan dipotong menyesuaikan bingkai di layar kecil). Format JPG, PNG, atau WebP, maksimal 4 MB.";

export const PAGE_IMAGE_PAGES: PageImagePageMeta[] = [
  {
    slug: "tentang-kami",
    label: "Tentang Kami",
    path: "/tentang-kami",
    slots: [
      {
        key: "about_hero",
        label: "Gambar hero",
        mediaPurpose: "hero",
        // Category 3 (pita lebar penuh) — same locked 2520×900 shape as
        // Hero Carousel from lg (1024px) up, via object-contain: an upload
        // in that ratio is shown whole, an off-ratio one is shown whole
        // too but with green strips beside it. Below lg the primary image
        // still fills the (shorter) band and is cropped — the safe zone
        // below is what survives that at every width from 390 to 2560px,
        // computed from the section's real h-105/sm:h-120/md:h-128 heights
        // and object-top position, not guessed.
        imageGuidance:
          "Disarankan 2520 × 900 px (rasio 2,8:1) — sama seperti Hero Carousel. Di layar 1024 px ke atas gambar " +
          "tampil utuh, tidak dipotong; gambar dengan rasio lain tetap tampil penuh, tetapi muncul ruang hijau di " +
          "sisinya. Di layar lebih kecil (atau bila tidak ada gambar mobile terpisah) foto dipotong menyesuaikan " +
          "bingkai — yang selalu terlihat hanya bagian atas foto, selebar sekitar 60% di tengah, jadi letakkan " +
          "subjek utama di sana. Format JPG, PNG, atau WebP, maksimal 4 MB.",
        supportsMobileImage: true,
        mobileImageGuidance: MOBILE_IMAGE_GUIDANCE,
      },
      {
        key: "about_story",
        label: 'Gambar "Satu Platform untuk Setiap Kebutuhan Properti"',
        mediaPurpose: "hero",
        // Category 2 (rasio tetap) — box is a real aspect-[3/2], so
        // 1600×1067 is already an exact match; the only thing missing was
        // saying what happens off-ratio.
        imageGuidance:
          "Disarankan 1600 × 1067 px (rasio 3:2). Bingkainya tetap 3:2 di semua ukuran layar — gambar dengan " +
          "rasio lain dipotong di bagian tengah agar pas. Format JPG, PNG, atau WebP, maksimal 4 MB.",
      },
      {
        key: "about_help_cta",
        label: 'Gambar "Apa yang bisa kami bantu?"',
        mediaPurpose: "hero",
        imageGuidance: HELP_CTA_GUIDANCE,
      },
    ],
  },
  {
    slug: "beranda",
    label: "Beranda",
    path: "/",
    slots: [
      {
        key: "home_property_valuation",
        label: 'Gambar "Ingin tahu berapa nilai properti Anda?"',
        mediaPurpose: "hero",
        // Category 3, same shape as about_hero above — the difference is
        // this section's glass panel sits on the right at lg (not
        // covering the top-left corner about_hero's does), so the safe
        // horizontal position differs.
        imageGuidance:
          "Disarankan 2520 × 900 px (rasio 2,8:1) — sama seperti Hero Carousel. Di layar 1024 px ke atas gambar " +
          "tampil utuh, tidak dipotong; gambar dengan rasio lain tetap tampil penuh, tetapi muncul ruang hijau di " +
          "sisinya. Di layar lebih kecil (atau bila tidak ada gambar mobile terpisah) foto dipotong menyesuaikan " +
          "bingkai — letakkan subjek utama sedikit di kiri dan di paruh atas foto. Panel kaca menutupi sisi kanan " +
          "foto di layar lebar (tepi bawah di layar kecil). Format JPG, PNG, atau WebP, maksimal 4 MB.",
        supportsMobileImage: true,
        mobileImageGuidance: MOBILE_IMAGE_GUIDANCE,
      },
      {
        key: "home_help_cta",
        label: 'Gambar "Apa yang bisa kami bantu?"',
        mediaPurpose: "hero",
        imageGuidance: HELP_CTA_GUIDANCE,
      },
    ],
  },
];

export function findPageImagePageBySlug(slug: string): PageImagePageMeta | undefined {
  return PAGE_IMAGE_PAGES.find((p) => p.slug === slug);
}

/** Which page tab owns a given slot key — used to revalidate the correct
 *  /content-media/[slug] path after a PATCH, since slot keys are unique
 *  across all pages but the save action only knows the key, not the page
 *  it came from. */
export function findPageImagePageBySlotKey(slotKey: string): PageImagePageMeta | undefined {
  return PAGE_IMAGE_PAGES.find((p) => p.slots.some((s) => s.key === slotKey));
}

/** The single slot's own metadata, e.g. to read `supportsMobileImage`
 *  without walking the page list at the call site. */
export function findPageImageSlot(slotKey: string): PageImageSlotMeta | undefined {
  return findPageImagePageBySlotKey(slotKey)?.slots.find((s) => s.key === slotKey);
}
