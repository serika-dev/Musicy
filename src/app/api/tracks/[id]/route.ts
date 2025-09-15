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

    const track = await prisma.track.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        duration: true,
        genre: true,
        playCount: true,
        createdAt: true,
        format: true,
        bitRate: true,
        sampleRate: true,
        filePath: true,
        isPublic: true,
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
            releaseDate: true,
          },
        },
      },
    })

    if (!track) {
      return NextResponse.json(
        { message: "Track not found" },
        { status: 404 }
      )
    }

    // Check if track is public
    if (!track.isPublic) {
      return NextResponse.json(
        { message: "Track not available" },
        { status: 403 }
      )
    }

    return NextResponse.json(track)
  } catch (error) {
    console.error("Error fetching track:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}