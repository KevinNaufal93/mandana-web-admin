import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  poweredByHeader: false,
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
};

export default nextConfig;
