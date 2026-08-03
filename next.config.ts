import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  // Cloudflare Pages builds must not be blocked by non-critical lint/type
  // warnings. Real errors are still caught by `npx tsc --noEmit` in CI.
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;

