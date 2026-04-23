import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { Toaster } from "sonner";
import { NativeAppBridge } from "@/components/native-app-bridge";
import { Providers } from "@/components/providers/session-provider";
import { ServiceWorkerRegistration } from "@/components/sw-registration";
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

export const metadata: Metadata = {
  title: "Serika Music - Lossless Streaming",
  description:
    "High-quality lossless music streaming. Part of the Serika ecosystem.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Musicy",
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
          title="Musicy oEmbed Profile"
          href="/api/oembed?url={url}"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased selection:bg-primary/30`}
      >
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
