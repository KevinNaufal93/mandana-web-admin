import type { MediaPurpose } from "@/lib/api/media";

/**
 * Client-safe page-image registry, split out of lib/api/page-images.ts for
 * the same reason lib/seo/shared.ts is: that file is `import "server-only"`,
 * so a client component (page-images-form.tsx) needing this registry's
 * runtime values — not just its types — cannot import it from there
 * without pulling serverApi() into the client bundle, which Next correctly
 * refuses to build.
 */

export interface PageImageSlotMeta {
  /** Matches the API's PageImageSlot enum value — sent as-is in the URL. */
  key: string;
  /** Label shown next to this slot's picker. */
  label: string;
  /** Passed to <ImagePicker purpose=...>. */
  mediaPurpose: MediaPurpose;
  /** Shown as the picker's advisory hint — recommended dimensions, format
   *  and max file size, derived from the actual measured render box on
   *  the public page. Never enforced client-side. */
  imageGuidance: string;
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
        imageGuidance:
          "Disarankan 1920 × 1280 px (rasio 3:2). Format WebP, maksimal 400 KB. Subjek utama sebaiknya di bagian atas foto — area bawah terpotong di layar lebar.",
      },
      {
        key: "about_story",
        label: 'Gambar "Satu Platform untuk Setiap Kebutuhan Properti"',
        mediaPurpose: "hero",
        imageGuidance: "Disarankan 1600 × 1067 px (rasio 3:2). Format WebP, maksimal 250 KB.",
      },
      {
        key: "about_help_cta",
        label: 'Gambar "Apa yang bisa kami bantu?"',
        mediaPurpose: "hero",
        imageGuidance:
          "Disarankan 1920 × 1280 px (rasio 3:2). Format WebP, maksimal 300 KB. Sisi kiri foto tertutup panel kaca — hindari foto yang sangat terang di sisi itu.",
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
        imageGuidance:
          "Disarankan 1920 × 1280 px (rasio 3:2). Format WebP, maksimal 400 KB. Foto ditampilkan sebagai pita lebar penuh — subjek utama sebaiknya sedikit di kiri dan di paruh atas foto. Di layar ponsel bingkainya nyaris persegi, jadi hindari subjek yang terlalu dekat ke tepi foto.",
      },
      {
        key: "home_help_cta",
        label: 'Gambar "Apa yang bisa kami bantu?"',
        mediaPurpose: "hero",
        imageGuidance:
          "Disarankan 1920 × 1280 px (rasio 3:2). Format WebP, maksimal 300 KB. Sisi kiri foto tertutup panel kaca — hindari foto yang sangat terang di sisi itu.",
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
