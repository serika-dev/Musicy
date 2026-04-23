import type { NextConfig } from "next";

const APP_ROUTE_HEADERS = [
  {
    key: "Cache-Control",
    value:
      "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0, no-transform",
  },
  {
    key: "CDN-Cache-Control",
    value: "no-store",
  },
  {
    key: "Cloudflare-CDN-Cache-Control",
    value: "no-store",
  },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "f003.backblazeb2.com",
      },
      {
        protocol: "https",
        hostname: "s3.eu-central-003.backblazeb2.com",
      },
    ],
  },
  serverExternalPackages: ["music-metadata"],
  async headers() {
    return [
      {
        source: "/:path*",
        has: [
          {
            type: "header",
            key: "accept",
            value: ".*(text/html|text/x-component).*",
          },
        ],
        headers: APP_ROUTE_HEADERS,
      },
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value:
              "no-store, no-cache, must-revalidate, max-age=0, no-transform",
          },
        ],
      },
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable, no-transform",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/developer",
        destination: "/developers",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
