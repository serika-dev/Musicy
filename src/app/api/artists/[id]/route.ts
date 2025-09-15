import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id } = await params

    const artist = await prisma.artist.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        bio: true,
        imageUrl: true,
        website: true,
        verified: true,
        createdAt: true,
        _count: {
          select: {
            tracks: { where: { isPublic: true } },
            albums: { where: { isPublic: true } },
            followers: true,
          },
        },
        tracks: {
          where: { isPublic: true },
          select: {
            id: true,
            title: true,
            duration: true,
            genre: true,
            format: true,
            filePath: true,
            bitRate: true,
            sampleRate: true,
            playCount: true,
            artist: {
              select: {
                id: true,
                name: true,
                verified: true,
              },
            },
            album: {
              select: {
                id: true,
                title: true,
                coverImageUrl: true,
              },
            },
          },
          orderBy: [
            { playCount: 'desc' },
            { createdAt: 'desc' },
          ],
          take: 20, // Top 20 tracks
        },
        albums: {
          where: { isPublic: true },
          select: {
            id: true,
            title: true,
            coverImageUrl: true,
            releaseDate: true,
            albumType: true,
            _count: {
              select: {
                tracks: { where: { isPublic: true } },
              },
            },
          },
          orderBy: {
            releaseDate: 'desc',
          },
        },
      },
    })

    if (!artist) {
      return NextResponse.json(
        { message: "Artist not found" },
        { status: 404 }
      )
    }

    if (!artist) {
      return NextResponse.json(
        { message: "Artist not found" },
        { status: 404 }
      )
    }

    // Attach follow state
    let isFollowing = false
    if (session?.user?.id) {
      const follow = await prisma.artistFollow.findUnique({
        where: {
          userId_artistId: {
            userId: session.user.id,
            artistId: id,
          },
        },
        select: { userId: true },
      })
      isFollowing = !!follow
    }

    return NextResponse.json({ ...artist, isFollowing })
  } catch (error) {
    console.error("Error fetching artist:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}
