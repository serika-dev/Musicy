import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'r2-musicy.serika.moe',
      },
    ],
  },
  // Configure for large file uploads
  experimental: {
    serverComponentsExternalPackages: ['music-metadata'],
  },
  // Enable server actions for large file handling
  serverExternalPackages: ['music-metadata'],
};

export default nextConfig;
