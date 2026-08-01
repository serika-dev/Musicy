import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { SITE_NAME, getAppUrl } from "@/lib/seo";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildEmbedHtml(opts: {
  appUrl: string;
  type: string;
  id: string;
  title: string;
  width: number;
  height: number;
}): string {
  const src = `${opts.appUrl}/embed/${opts.type}/${opts.id}`;
  const safeTitle = opts.title.replace(/"/g, "&quot;");
  return `<iframe width="100%" height="${opts.height}" title="${SITE_NAME} Embed: ${safeTitle}" style="border-radius:12px;border:0;max-width:100%;overflow:hidden;background:transparent" frameborder="0" allowfullscreen allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" src="${src}"></iframe>`;
}

function toXml(payload: Record<string, string | number>): string {
  const fields = Object.entries(payload)
    .map(([key, value]) => {
      const text =
        typeof value === "string" ? escapeXml(value) : String(value);
      // html field contains markup — wrap in CDATA
      if (key === "html") {
        return `<${key}><![CDATA[${value}]]></${key}>`;
      }
      return `<${key}>${text}</${key}>`;
    })
    .join("");
  return `<?xml version="1.0" encoding="utf-8" standalone="yes"?><oembed>${fields}</oembed>`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const targetUrl = searchParams.get("url");
  const format = (searchParams.get("format") || "json").toLowerCase();
  const maxwidth = Math.min(
    Number(searchParams.get("maxwidth")) || 456,
    1200,
  );
  const maxheight = Math.min(
    Number(searchParams.get("maxheight")) || 152,
    600,
  );

  if (!targetUrl) {
    return NextResponse.json(
      { error: "Missing url parameter" },
      { status: 400 },
    );
  }

  const appUrl = getAppUrl();

  try {
    const url = new URL(targetUrl);
    const segments = url.pathname.split("/").filter(Boolean);

    // Expect: tracks|albums|artists|playlists/[id]
    if (segments.length < 2) {
      return NextResponse.json(
        { error: "Invalid Musicy URL" },
        { status: 400 },
      );
    }

    const type = segments[0];
    const id = segments[1];

    if (!["tracks", "albums", "artists", "playlists"].includes(type)) {
      return NextResponse.json(
        { error: "Unsupported content type" },
        { status: 400 },
      );
    }

    let title = "Musicy Content";
    let thumbnail_url = "";
    let author_name = SITE_NAME;
    let author_url = appUrl;

    if (type === "tracks") {
      const track = await prisma.track.findUnique({
        where: { id },
        include: { artist: true, album: true },
      });
      if (!track) {
        return NextResponse.json({ error: "Track not found" }, { status: 404 });
      }
      title = track.title;
      author_name = track.artist.name;
      author_url = `${appUrl}/artists/${track.artist.id}`;
      thumbnail_url =
        track.coverImageUrl || track.album?.coverImageUrl || "";
    } else if (type === "albums") {
      const album = await prisma.album.findUnique({
        where: { id },
        include: { artist: true },
      });
      if (!album) {
        return NextResponse.json({ error: "Album not found" }, { status: 404 });
      }
      title = album.title;
      author_name = album.artist.name;
      author_url = `${appUrl}/artists/${album.artist.id}`;
      thumbnail_url = album.coverImageUrl || "";
    } else if (type === "artists") {
      const artist = await prisma.artist.findUnique({ where: { id } });
      if (!artist) {
        return NextResponse.json(
          { error: "Artist not found" },
          { status: 404 },
        );
      }
      title = artist.name;
      author_name = artist.name;
      author_url = `${appUrl}/artists/${artist.id}`;
      thumbnail_url = artist.imageUrl || "";
    } else if (type === "playlists") {
      const playlist = await prisma.playlist.findUnique({
        where: { id },
        include: { owner: true },
      });
      if (!playlist) {
        return NextResponse.json(
          { error: "Playlist not found" },
          { status: 404 },
        );
      }
      title = playlist.name;
      author_name =
        playlist.owner.displayName ||
        playlist.owner.username ||
        "Musicy User";
      author_url = `${appUrl}/profile/${playlist.owner.id}`;
      thumbnail_url = playlist.coverImageUrl || "";
    }

    const width = Math.max(200, maxwidth);
    const height = Math.max(80, maxheight);
    const html = buildEmbedHtml({
      appUrl,
      type,
      id,
      title,
      width,
      height,
    });

    const oembedResponse = {
      version: "1.0",
      type: "rich" as const,
      provider_name: SITE_NAME,
      provider_url: appUrl,
      cache_age: 3600,
      title,
      author_name,
      author_url,
      thumbnail_url: thumbnail_url || undefined,
      thumbnail_width: thumbnail_url ? 300 : undefined,
      thumbnail_height: thumbnail_url ? 300 : undefined,
      width,
      height,
      html,
    };

    // Strip undefined keys for a clean payload
    const clean = Object.fromEntries(
      Object.entries(oembedResponse).filter(([, v]) => v !== undefined),
    ) as Record<string, string | number>;

    if (format === "xml") {
      return new NextResponse(toXml(clean), {
        headers: {
          "Content-Type": "text/xml; charset=utf-8",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    return NextResponse.json(clean, {
      headers: {
        "Content-Type": "application/json+oembed; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    if (err instanceof TypeError) {
      return NextResponse.json(
        { error: "Invalid URL provided" },
        { status: 400 },
      );
    }
    console.error("oEmbed error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
