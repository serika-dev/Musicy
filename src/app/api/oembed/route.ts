import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const targetUrl = searchParams.get("url")
  const format = searchParams.get("format") || "json"

  if (!targetUrl) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://musicy.app"

  // Parse Musicy URL (e.g., https://musicy.app/tracks/123)
  try {
    const url = new URL(targetUrl)
    const segments = url.pathname.split("/").filter(Boolean)
    
    // We expect patterns like: tracks/[id], albums/[id], artists/[id], playlists/[id]
    if (segments.length < 2) {
      return NextResponse.json({ error: "Invalid Musicy URL" }, { status: 400 })
    }

    const type = segments[0] // tracks, albums, artists, playlists
    const id = segments[1]

    let title = "Musicy Content"
    let thumbnail_url = ""
    let author_name = "Musicy"

    if (type === "tracks") {
      const track = await prisma.track.findUnique({
        where: { id },
        include: { artist: true, album: true }
      })
      if (track) {
        title = track.title
        author_name = track.artist.name
        thumbnail_url = track.album?.coverImageUrl || ""
      }
    } else if (type === "albums") {
      const album = await prisma.album.findUnique({
        where: { id },
        include: { artist: true }
      })
      if (album) {
        title = album.title
        author_name = album.artist.name
        thumbnail_url = album.coverImageUrl || ""
      }
    } else if (type === "artists") {
      const artist = await prisma.artist.findUnique({
        where: { id }
      })
      if (artist) {
        title = artist.name
        thumbnail_url = artist.imageUrl || ""
      }
    } else if (type === "playlists") {
      const playlist = await prisma.playlist.findUnique({
        where: { id },
        include: { owner: true }
      })
      if (playlist) {
        title = playlist.name
        author_name = playlist.owner.displayName || playlist.owner.username || "Musicy User"
        thumbnail_url = playlist.coverImageUrl || ""
      }
    } else {
      return NextResponse.json({ error: "Unsupported content type" }, { status: 400 })
    }

    const oembedResponse = {
      version: "1.0",
      type: "rich",
      provider_name: "Musicy",
      provider_url: url.origin,
      title: title,
      author_name: author_name,
      thumbnail_url: thumbnail_url,
      thumbnail_width: 300,
      thumbnail_height: 300,
      width: 456,
      height: 152,
      html: `<iframe width="100%" height="152" title="Musicy Embed: ${title}" style="border-radius: 12px" frameborder="0" allowfullscreen allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" src="${appUrl}/embed/${type}/${id}"></iframe>`
    }

    if (format === "xml") {
      // Basic XML support if really needed, but JSON is standard
      return new NextResponse("<?xml version=\"1.0\" encoding=\"utf-8\" standalone=\"yes\"?><oembed>...</oembed>", {
        headers: { "Content-Type": "text/xml" }
      })
    }

    return new NextResponse(JSON.stringify(oembedResponse), {
      headers: {
        "Content-Type": "application/json+oembed"
      }
    })
  } catch (err) {
    if (err instanceof TypeError) {
      return NextResponse.json({ error: "Invalid URL provided" }, { status: 400 })
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
