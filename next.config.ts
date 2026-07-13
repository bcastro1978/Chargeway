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
  reactStrictMode: false,
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  serverExternalPackages: ['sharp'],
  experimental: {
    serverComponentsExternalPackages: ['sharp']
  }
};

export default withPWA(nextConfig);
