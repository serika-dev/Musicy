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
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const artist = await prisma.artist.findUnique({
      where: { id },
      select: { id: true, name: true },
    })

    if (!artist) {
      return NextResponse.json({ message: "Artist not found" }, { status: 404 })
    }

    const [tracks, total] = await Promise.all([
      prisma.track.findMany({
        where: { artistId: id, isPublic: true },
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
          artist: {
            select: { id: true, name: true, verified: true },
          },
          album: {
            select: { id: true, title: true, coverImageUrl: true },
          },
        },
        orderBy: [{ playCount: 'desc' }, { createdAt: 'desc' }],
        take: limit,
        skip: offset,
      }),
      prisma.track.count({ where: { artistId: id, isPublic: true } }),
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
