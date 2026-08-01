import type { Metadata } from "next";

/** Site identity used in Open Graph, Twitter, JSON-LD, and oEmbed. */
export const SITE_NAME = "Serika Music";
export const SITE_SHORT_NAME = "Musicy";
export const SITE_LOCALE = "en_US";
export const TWITTER_SITE = "@serikadev";

/** Prefer public app URL; production fallback matches deployed host. */
export function getAppUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    "https://music.serika.dev";
  return raw.replace(/\/$/, "");
}

export function absoluteUrl(path = "/"): string {
  if (/^https?:\/\//i.test(path)) return path;
  const base = getAppUrl();
  if (!path || path === "/") return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

const DEFAULT_OG_IMAGE = absoluteUrl("/og-default.png");

export type EntitySeoInput = {
  /** Path relative to site root, e.g. /artists/abc */
  path: string;
  title: string;
  description: string;
  imageUrl?: string | null;
  imageAlt?: string;
  /** openGraph.type — music.song | music.album | profile | music.playlist | website */
  ogType?:
    | "website"
    | "profile"
    | "music.song"
    | "music.album"
    | "music.playlist"
    | "article";
  /** Use Twitter player card for embeddable media */
  twitterPlayer?: boolean;
  /** Embed path segment type for oEmbed / twitter:player */
  embedType?: "tracks" | "albums" | "artists" | "playlists";
  embedId?: string;
};

/**
 * Build rich Next.js Metadata for media entity pages and the site root.
 */
export function buildEntityMetadata(input: EntitySeoInput): Metadata {
  const appUrl = getAppUrl();
  const pageUrl = absoluteUrl(input.path);
  const title = input.title;
  const description = input.description;
  const imageUrl = input.imageUrl?.trim() || DEFAULT_OG_IMAGE;
  const imageAlt = input.imageAlt || title;
  const ogType = input.ogType || "website";

  const images = [
    {
      url: imageUrl,
      // Music covers are typically square; platforms crop to 1.91:1 for cards.
      // Declaring dimensions avoids delayed layout while still accepting square art.
      width: 1200,
      height: 1200,
      alt: imageAlt,
    },
  ];

  const oembedJson = `${appUrl}/api/oembed?url=${encodeURIComponent(pageUrl)}`;
  const oembedXml = `${appUrl}/api/oembed?url=${encodeURIComponent(pageUrl)}&format=xml`;

  const other: Record<string, string | number | (string | number)[]> = {
    "og:image:alt": imageAlt,
    "og:image:width": "1200",
    "og:image:height": "1200",
  };

  if (input.twitterPlayer && input.embedType && input.embedId) {
    other["twitter:player"] =
      `${appUrl}/embed/${input.embedType}/${input.embedId}`;
    other["twitter:player:width"] = "456";
    other["twitter:player:height"] = "152";
  }

  return {
    title,
    description,
    applicationName: SITE_NAME,
    authors: [{ name: SITE_NAME, url: appUrl }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    metadataBase: new URL(appUrl),
    alternates: {
      canonical: pageUrl,
      types: {
        "application/json+oembed": oembedJson,
        "text/xml+oembed": oembedXml,
      },
    },
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName: SITE_NAME,
      locale: SITE_LOCALE,
      type: ogType,
      images,
    },
    twitter: {
      card: input.twitterPlayer ? "player" : "summary_large_image",
      site: TWITTER_SITE,
      creator: TWITTER_SITE,
      title,
      description,
      images: [imageUrl],
    },
    other,
  };
}

export function musicGroupJsonLd(opts: {
  name: string;
  url: string;
  image?: string | null;
  description?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "MusicGroup",
    name: opts.name,
    url: opts.url,
    ...(opts.image ? { image: opts.image } : {}),
    ...(opts.description ? { description: opts.description } : {}),
  };
}

export function musicAlbumJsonLd(opts: {
  name: string;
  url: string;
  image?: string | null;
  description?: string;
  byArtist: string;
  datePublished?: string | Date | null;
  numTracks?: number;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "MusicAlbum",
    name: opts.name,
    url: opts.url,
    ...(opts.image ? { image: opts.image } : {}),
    ...(opts.description ? { description: opts.description } : {}),
    byArtist: {
      "@type": "MusicGroup",
      name: opts.byArtist,
    },
    ...(opts.datePublished
      ? {
          datePublished:
            opts.datePublished instanceof Date
              ? opts.datePublished.toISOString().slice(0, 10)
              : String(opts.datePublished).slice(0, 10),
        }
      : {}),
    ...(opts.numTracks != null ? { numTracks: opts.numTracks } : {}),
  };
}

export function musicRecordingJsonLd(opts: {
  name: string;
  url: string;
  image?: string | null;
  description?: string;
  byArtist: string;
  durationSeconds?: number | null;
  inAlbum?: string | null;
}) {
  const duration =
    opts.durationSeconds && opts.durationSeconds > 0
      ? `PT${Math.round(opts.durationSeconds)}S`
      : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "MusicRecording",
    name: opts.name,
    url: opts.url,
    ...(opts.image ? { image: opts.image } : {}),
    ...(opts.description ? { description: opts.description } : {}),
    byArtist: {
      "@type": "MusicGroup",
      name: opts.byArtist,
    },
    ...(duration ? { duration } : {}),
    ...(opts.inAlbum
      ? {
          inAlbum: {
            "@type": "MusicAlbum",
            name: opts.inAlbum,
          },
        }
      : {}),
  };
}

export function musicPlaylistJsonLd(opts: {
  name: string;
  url: string;
  image?: string | null;
  description?: string;
  authorName: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "MusicPlaylist",
    name: opts.name,
    url: opts.url,
    ...(opts.image ? { image: opts.image } : {}),
    ...(opts.description ? { description: opts.description } : {}),
    author: {
      "@type": "Person",
      name: opts.authorName,
    },
  };
}

export function websiteJsonLd() {
  const appUrl = getAppUrl();
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    alternateName: SITE_SHORT_NAME,
    url: appUrl,
    description:
      "High-quality lossless music streaming. Stream FLAC, create playlists, and discover artists on Serika Music.",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${appUrl}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/** Serialize JSON-LD for a <script type="application/ld+json"> tag. */
export function jsonLdScript(data: Record<string, unknown> | Record<string, unknown>[]) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
