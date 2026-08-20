import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "http", hostname: "localhost", port: "9000", pathname: "/**" }, // dev (MinIO)
      { protocol: "https", hostname: "mandana-media-storage-dev.s3.ap-southeast-1.amazonaws.com", pathname: "/**" }, // deployed (S3)
    ],
  },
};

export default nextConfig;
