import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get("q")
  const type = searchParams.get("type")?.split(",") || ["track", "album", "artist", "playlist"]
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50)
  const offset = parseInt(searchParams.get("offset") || "0")

  if (!query) {
    return NextResponse.json({ error: "No search query provided" }, { status: 400 })
  }

  const results: any = {}

  if (type.includes("track")) {
    results.tracks = {
      items: (await prisma.track.findMany({
        where: { title: { contains: query, mode: "insensitive" } },
        include: { artist: true, album: true },
        take: limit,
        skip: offset,
      })).map(track => ({ ...track, fileSize: track.fileSize.toString() })),
      limit,
      offset,
      total: await prisma.track.count({ where: { title: { contains: query, mode: "insensitive" } } })
    }
  }

  if (type.includes("artist")) {
    // altNames is a String[] which doesn't support mode:insensitive in Prisma
    // Generate case variants for hasSome search
    const queryVariants = [query, query.charAt(0).toUpperCase() + query.slice(1), query.toUpperCase(), query.toLowerCase()]
      .filter((v, i, arr) => arr.indexOf(v) === i)
    const artistWhere = {
      OR: [
        { name: { contains: query, mode: "insensitive" as const } },
        { altNames: { hasSome: queryVariants } },
      ]
    }
    results.artists = {
      items: await prisma.artist.findMany({
        where: artistWhere,
        take: limit,
        skip: offset,
      }),
      limit,
      offset,
      total: await prisma.artist.count({ where: artistWhere })
    }
  }

  if (type.includes("album")) {
    results.albums = {
      items: await prisma.album.findMany({
        where: { title: { contains: query, mode: "insensitive" } },
        include: { artist: true },
        take: limit,
        skip: offset,
      }),
      limit,
      offset,
      total: await prisma.album.count({ where: { title: { contains: query, mode: "insensitive" } } })
    }
  }

  if (type.includes("playlist")) {
    results.playlists = {
      items: await prisma.playlist.findMany({
        where: { 
          name: { contains: query, mode: "insensitive" },
          isPublic: true
        },
        include: { owner: true },
        take: limit,
        skip: offset,
      }),
      limit,
      offset,
      total: await prisma.playlist.count({ 
        where: { name: { contains: query, mode: "insensitive" }, isPublic: true } 
      })
    }
  }

  return NextResponse.json(results)
}
