import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { validateApiKey } from "@/lib/api-utils"

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions)
    const apiKeyUser = await validateApiKey(request)

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const limit = Math.min(500, Math.max(1, parseInt(searchParams.get('limit') || '200', 10) || 200))
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10) || 0)
    const includeFeatured = searchParams.get('featured') !== '0'

    const artist = await prisma.artist.findUnique({
      where: { id },
      select: { id: true, name: true },
    })

    if (!artist) {
      return NextResponse.json({ message: "Artist not found" }, { status: 404 })
    }

    const where = {
      isPublic: true,
      ...(includeFeatured
        ? {
            OR: [
              { artistId: id },
              { featuredArtists: { some: { id } } },
            ],
          }
        : { artistId: id }),
    }

    const [tracks, total] = await Promise.all([
      prisma.track.findMany({
        where,
        select: {
          id: true,
          title: true,
          duration: true,
          coverImageUrl: true,
          genre: true,
          format: true,
          filePath: true,
          bitRate: true,
          sampleRate: true,
          playCount: true,
          year: true,
          trackNumber: true,
          artist: {
            select: { id: true, name: true, verified: true },
          },
          album: {
            select: { id: true, title: true, coverImageUrl: true },
          },
          featuredArtists: {
            select: { id: true, name: true },
          },
        },
        orderBy: [{ playCount: 'desc' }, { createdAt: 'desc' }],
        take: limit,
        skip: offset,
      }),
      prisma.track.count({ where }),
    ])

    const isAuthorized = session || apiKeyUser
    const maskedTracks = tracks.map((track: any) => ({
      ...track,
      filePath: isAuthorized ? track.filePath : undefined,
    }))

    return NextResponse.json({
      tracks: maskedTracks,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    })
  } catch (error) {
    console.error("Error fetching artist tracks:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
