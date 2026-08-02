import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { validateApiKey } from "@/lib/api-utils"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const apiKeyUser = await validateApiKey(request)
    const user = session?.user || apiKeyUser

    if (!user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const genre = searchParams.get('genre')
    const search = searchParams.get('search')

    const whereClause: any = {
      isPublic: true,
    }

    if (genre) {
      whereClause.genre = genre
    }

    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { artist: { name: { contains: search, mode: 'insensitive' } } },
        { album: { title: { contains: search, mode: 'insensitive' } } },
        { genre: { contains: search, mode: 'insensitive' } },
        { featuredArtists: { some: { name: { contains: search, mode: 'insensitive' } } } },
      ]
    }

    const tracks = await prisma.track.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
        duration: true,
        coverImageUrl: true,
        filePath: true,
        format: true,
        bitRate: true,
        sampleRate: true,
        genre: true,
        playCount: true,
        artist: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            verified: true,
          },
        },
        featuredArtists: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
          },
        },
        album: {
          select: {
            id: true,
            title: true,
            coverImageUrl: true,
            albumType: true,
            featuredArtists: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
              },
            },
          },
        },
      },
      orderBy: [
        { playCount: 'desc' },
        { createdAt: 'desc' },
      ],
      take: limit,
      skip: offset,
    })

    const total = await prisma.track.count({ where: whereClause })

    return NextResponse.json({
      tracks,
      total,
      limit,
      offset,
      hasMore: offset + tracks.length < total,
    })
  } catch (error) {
    console.error("Error fetching tracks:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}
