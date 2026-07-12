import type { NextConfig } from "next";

const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  // Caching settings for Mapbox and API
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  manifest: {
    filePath: "public/manifest.json"
  }
});

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  serverExternalPackages: ['@google-cloud/vision', 'sharp'],
  experimental: {
    serverComponentsExternalPackages: ['@google-cloud/vision', 'sharp']
  }
};

export default withPWA(nextConfig);
