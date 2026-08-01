import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { Toaster } from "sonner";
import { JsonLd } from "@/components/json-ld";
import { NativeAppBridge } from "@/components/native-app-bridge";
import { Providers } from "@/components/providers/session-provider";
import { ServiceWorkerRegistration } from "@/components/sw-registration";
import {
  SITE_LOCALE,
  SITE_NAME,
  SITE_SHORT_NAME,
  TWITTER_SITE,
  absoluteUrl,
  getAppUrl,
  websiteJsonLd,
} from "@/lib/seo";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const dynamic = "force-dynamic";
export const revalidate = 0;

const appUrl = getAppUrl();

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: `${SITE_NAME} — Lossless Music Streaming`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Stream high-fidelity lossless music in FLAC quality. Create playlists, follow artists, and enjoy studio-grade audio on Serika Music — part of the Serika ecosystem.",
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: appUrl }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  keywords: [
    "lossless music",
    "FLAC streaming",
    "hi-fi music",
    "Serika Music",
    "Musicy",
    "online music player",
  ],
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/favicon.ico"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: SITE_SHORT_NAME,
  },
  alternates: {
    canonical: appUrl,
    types: {
      "application/json+oembed": `${appUrl}/api/oembed?url={url}`,
      "text/xml+oembed": `${appUrl}/api/oembed?url={url}&format=xml`,
    },
  },
  openGraph: {
    type: "website",
    locale: SITE_LOCALE,
    url: appUrl,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Lossless Music Streaming`,
    description:
      "Stream high-fidelity lossless music in FLAC quality. Create playlists, follow artists, and enjoy studio-grade audio on Serika Music.",
    images: [
      {
        url: absoluteUrl("/og-default.png"),
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} — Lossless music streaming`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: TWITTER_SITE,
    creator: TWITTER_SITE,
    title: `${SITE_NAME} — Lossless Music Streaming`,
    description:
      "Stream high-fidelity lossless music in FLAC quality. Create playlists, follow artists, and enjoy studio-grade audio.",
    images: [absoluteUrl("/og-default.png")],
  },
  other: {
    "og:image:width": "1200",
    "og:image:height": "630",
    "og:image:alt": `${SITE_NAME} — Lossless music streaming`,
  },
};

export const viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <Script
          src="/web-scrobbler-connector.js"
          strategy="afterInteractive"
          id="web-scrobbler-connector"
        />
        <link
          rel="alternate"
          type="application/json+oembed"
          title={`${SITE_NAME} oEmbed`}
          href={`${appUrl}/api/oembed?url={url}`}
        />
        <link
          rel="alternate"
          type="text/xml+oembed"
          title={`${SITE_NAME} oEmbed XML`}
          href={`${appUrl}/api/oembed?url={url}&format=xml`}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased selection:bg-primary/30`}
      >
        <JsonLd data={websiteJsonLd()} />
        <Providers>
          <NativeAppBridge />
          <ServiceWorkerRegistration />
          {children}
          <Toaster
            position="top-right"
            richColors
            closeButton
            toastOptions={{
              style: {
                background: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                color: "hsl(var(--foreground))",
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
