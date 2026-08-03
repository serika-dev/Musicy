import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getAuthSession } from "@/lib/mobile-auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession(request)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Get followed artists for the current user
    const followedArtists = await prisma.artistFollow.findMany({
      where: {
        userId: session.user.id
      },
      include: {
        artist: {
          select: {
            id: true,
            name: true,
            verified: true,
            imageUrl: true,
            bio: true,
            _count: {
              select: {
                tracks: true,
                followers: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      skip: offset
    })

    const total = await prisma.artistFollow.count({
      where: {
        userId: session.user.id
      }
    })

    // Transform the data
    const artists = followedArtists.map(follow => ({
      ...follow.artist,
      followedAt: follow.createdAt
    }))

    return NextResponse.json({
      artists,
      total,
      limit,
      offset,
    })

  } catch (error) {
    console.error("Error fetching followed artists:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}
