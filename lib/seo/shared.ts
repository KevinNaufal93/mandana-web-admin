/**
 * Client-safe SEO types + data, split out of lib/api/seo.ts for the same
 * reason lib/rbac/modules.ts's ACCESS_MODULES is: lib/api/seo.ts is
 * `import "server-only"`, so a client component (page-seo-form.tsx,
 * seo-settings-form.tsx) needing SEO_PAGE_META's runtime values — not
 * just its types — cannot import it from there without pulling
 * serverApi()/verifySession() into the client bundle, which Next
 * correctly refuses to build.
 */

export const SEO_PAGE_KEYS = [
  "home",
  "properties",
  "about",
  "moving",
  "storage",
  "storage_booking",
  "event",
  "articles",
] as const;

export type SeoPageKey = (typeof SEO_PAGE_KEYS)[number];

export interface AdminSeoImage {
  url: string;
  srcset: string;
  srcsetAvif: string;
  placeholder: string | null;
  alt: string | null;
  width: number;
  height: number;
}

export interface AdminSeoSettings {
  organizationName: string;
  contactPhone: string | null;
  contactEmail: string | null;
  streetAddress: string | null;
  addressLocality: string | null;
  addressRegion: string | null;
  postalCode: string | null;
  /** Known keys the public site renders as footer icons: instagram,
   *  tiktok, facebook, youtube, x, linkedin. */
  socialLinks: Record<string, string>;
  googleSiteVerification: string | null;
  bingSiteVerification: string | null;
  defaultOgImage: AdminSeoImage | null;
}

export interface AdminPageSeo {
  pageKey: SeoPageKey;
  metaTitle: string | null;
  metaDescription: string | null;
  /** Only meaningful for `home` — the hidden <h1> behind the image-only hero. */
  heading: string | null;
  noIndex: boolean;
  ogImage: AdminSeoImage | null;
}

/**
 * Admin-facing label/path + the one page (`home`) this UI must not offer
 * a "hide from Google" switch for — mirrors SEO_PAGES on the API side.
 * The API rejects noIndex:true for `home` regardless; this just keeps
 * the UI honest about it up front instead of showing a control that
 * 400s.
 *
 * `titleDefault`/`descriptionDefault` are what the web app's own
 * buildPageMetadata() falls back to when a page's title/description is
 * null — shown here as the edit form's placeholder text and the
 * "(judul bawaan)" list label, so an admin can see what's live even
 * before they've ever touched a field. Necessarily duplicated from the
 * web repo's hardcoded page metadata (a separate repo, not imported
 * here) — keep in sync if either changes. Byte-identical to the AddSeo
 * migration's seed data on the API side, which is what makes today's
 * live titles/descriptions match these on first load.
 */
export const SEO_PAGE_META: Record<
  SeoPageKey,
  { label: string; path: string; canHide: boolean; titleDefault: string; descriptionDefault: string }
> = {
  home: {
    label: "Beranda",
    path: "/",
    canHide: false,
    titleDefault: "Mandana Property — Temukan Rumah Impianmu",
    descriptionDefault:
      "Beli, sewa, atau temukan properti terbaik yang sesuai dengan gaya hidupmu bersama Mandana Property.",
  },
  properties: {
    label: "Semua Properti",
    path: "/properties",
    canHide: true,
    titleDefault: "Semua Property",
    descriptionDefault:
      "Jelajahi pilihan properti untuk dibeli atau disewa yang sesuai dengan kebutuhanmu di Mandana Property.",
  },
  about: {
    label: "Tentang Kami",
    path: "/tentang-kami",
    canHide: true,
    titleDefault: "Tentang Kami",
    descriptionDefault:
      "Mandana Property menghubungkan pencarian hunian dengan layanan pindahan, penyimpanan, dan acara — semuanya dalam satu platform.",
  },
  moving: {
    label: "Mandana Move",
    path: "/layanan/moving",
    canHide: true,
    titleDefault: "Mandana Move",
    descriptionDefault:
      "Pindahan aman, cepat, dan terpercaya. Pilih truk sesuai kebutuhanmu, tentukan lokasi jemput dan tujuan, lalu dapatkan estimasi biaya langsung dari Mandana.",
  },
  storage: {
    label: "Mandana Space",
    path: "/layanan/storage",
    canHide: true,
    titleDefault: "Smart Storage",
    descriptionDefault:
      "Simpan barang yang berarti tanpa memenuhi ruang di rumah. Temukan lokasi, buat appointment, dan pindah masuk unit Mandana Smart Storage dengan mudah dan aman.",
  },
  storage_booking: {
    label: "Booking Smart Storage",
    path: "/layanan/storage/booking",
    canHide: true,
    titleDefault: "Booking Smart Storage",
    descriptionDefault:
      "Pilih lokasi dan ukuran unit Smart Storage, lihat ketersediaan secara langsung, dan kirim permintaan booking dalam hitungan menit.",
  },
  event: {
    label: "Mandana Living",
    path: "/layanan/event",
    canHide: true,
    titleDefault: "Event Support",
    descriptionDefault:
      "Mulai dari perayaan kecil hingga acara berskala besar, Mandana siap membantu mengelola berbagai kebutuhan event Anda dengan solusi yang praktis dan profesional.",
  },
  articles: {
    label: "Artikel",
    path: "/artikel",
    canHide: true,
    titleDefault: "Artikel",
    descriptionDefault:
      "Tips, panduan, dan berita seputar properti, KPR, dan investasi rumah — ditulis oleh tim Mandana Property.",
  },
};
