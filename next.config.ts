import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'f003.backblazeb2.com',
      },
      {
        protocol: 'https',
        hostname: 's3.eu-central-003.backblazeb2.com',
      },
    ],
  },
  serverExternalPackages: ['music-metadata'],
  async redirects() {
    return [
      {
        source: '/developer',
        destination: '/developers',
        permanent: true,
      },
    ]
  },
};

export default nextConfig;
