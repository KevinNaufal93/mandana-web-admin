import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  poweredByHeader: false,
  // Moving's "leads" resource was renamed to "bookings" (see
  // lib/moving/query.ts's header comment) — keep old bookmarks/links alive
  // rather than 404ing.
  async redirects() {
    return [
      { source: "/moving/leads", destination: "/moving/bookings", permanent: true },
      { source: "/moving/leads/:id", destination: "/moving/bookings/:id", permanent: true },
    ];
  },
  experimental: {
    serverActions: {
      // Default is 1MB — every image upload in this app (user photos,
      // hero/service-card/property/storage images) goes through a Server
      // Action and is validated client-side up to 20MB (e.g.
      // user-photo-card.tsx), so the framework default silently rejects
      // any real photo before the action code (or the API) ever sees it —
      // a generic 500 with no application log and no backend request.
      // 21mb leaves headroom for multipart boundary/header overhead on
      // top of a 20MB file, per Next's own sizing guidance.
      bodySizeLimit: "21mb",
    },
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "http", hostname: "localhost", port: "9000", pathname: "/**" }, // dev (MinIO)
      { protocol: "https", hostname: "mandana-media-storage-dev.s3.ap-southeast-1.amazonaws.com", pathname: "/**" }, // deployed (S3)
    ],
  },
  // The booking PDF export (lib/bookings/pdf/) renders with
  // @react-pdf/renderer, which reads its fonts from disk at runtime
  // (lib/bookings/pdf/fonts/*.ttf|otf) rather than importing them as
  // modules — Next's default trace can miss files only ever touched via
  // fs.readFileSync/path.join, silently 404-ing the fonts (or throwing)
  // once deployed. Keep this in sync with the paths read by
  // lib/bookings/pdf/fonts.ts and lib/bookings/pdf/chrome.tsx.
  outputFileTracingIncludes: {
    "/**": ["./lib/bookings/pdf/fonts/**", "./public/images/logo/logo_text_white.png"],
  },
};

export default nextConfig;
