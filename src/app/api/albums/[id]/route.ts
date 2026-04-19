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
    // Allow public access for basic metadata (needed for Embeds)

    const { id } = await params

    const album = await prisma.album.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        coverImageUrl: true,
        releaseDate: true,
        genre: true,
        albumType: true,
        isPublic: true,
        createdAt: true,
        artist: {
          select: {
            id: true,
            name: true,
            verified: true,
          },
        },
        tracks: {
          where: { isPublic: true },
          select: {
            id: true,
            title: true,
            duration: true,
            filePath: true,
            format: true,
            trackNumber: true,
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
            { trackNumber: 'asc' },
            { createdAt: 'asc' },
          ],
        },
        _count: {
          select: {
            tracks: { where: { isPublic: true } },
          },
        },
      },
    })

    if (!album) {
      return NextResponse.json(
        { message: "Album not found" },
        { status: 404 }
      )
    }

    // Check if album is public
    if (!album.isPublic) {
      return NextResponse.json(
        { message: "Album not available" },
        { status: 403 }
      )
    }

    return NextResponse.json(album)
  } catch (error) {
    console.error("Error fetching album:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}
