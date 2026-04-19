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

    const playlist = await prisma.playlist.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        coverImageUrl: true,
        isPublic: true,
        isCollaborative: true,
        createdAt: true,
        updatedAt: true,
        owner: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        tracks: {
          select: {
            id: true,
            position: true,
            addedAt: true,
            addedBy: {
              select: {
                id: true,
                username: true,
                displayName: true,
              },
            },
            track: {
              select: {
                id: true,
                title: true,
                duration: true,
                format: true,
                filePath: true,
                bitRate: true,
                sampleRate: true,
                genre: true,
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
            },
          },
          orderBy: {
            position: 'asc',
          },
        },
        _count: {
          select: {
            tracks: true,
            likes: true,
          },
        },
      },
    })

    if (!playlist) {
      return NextResponse.json(
        { message: "Playlist not found" },
        { status: 404 }
      )
    }

    // Check if user can access this playlist
    const isOwner = session?.user?.id === playlist.owner.id
    const isPublic = playlist.isPublic

    if (!isOwner && !isPublic && !apiKeyUser) {
      return NextResponse.json(
        { message: "Access denied to private playlist" },
        { status: 403 }
      )
    }

    const isAuthorized = session || apiKeyUser;

    // Mask file paths for unauthorized access
    const returnedPlaylist = {
      ...playlist,
      tracks: playlist.tracks.map(pt => ({
        ...pt,
        track: {
          ...pt.track,
          filePath: isAuthorized ? pt.track.filePath : undefined
        }
      }))
    }

    return NextResponse.json(returnedPlaylist)
  } catch (error) {
    console.error("Error fetching playlist:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, description, isPublic } = body

    // Check if user owns this playlist
    const existingPlaylist = await prisma.playlist.findUnique({
      where: { id },
      select: { ownerId: true },
    })

    if (!existingPlaylist) {
      return NextResponse.json({ message: "Playlist not found" }, { status: 404 })
    }

    if (existingPlaylist.ownerId !== session.user.id) {
      return NextResponse.json({ message: "Access denied" }, { status: 403 })
    }

    const updatedPlaylist = await prisma.playlist.update({
      where: { id },
      data: {
        name,
        description,
        isPublic,
      },
      select: {
        id: true,
        name: true,
        description: true,
        isPublic: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(updatedPlaylist)
  } catch (error) {
    console.error("Error updating playlist:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // Check if user owns this playlist
    const existingPlaylist = await prisma.playlist.findUnique({
      where: { id },
      select: { ownerId: true },
    })

    if (!existingPlaylist) {
      return NextResponse.json({ message: "Playlist not found" }, { status: 404 })
    }

    if (existingPlaylist.ownerId !== session.user.id) {
      return NextResponse.json({ message: "Access denied" }, { status: 403 })
    }

    await prisma.playlist.delete({
      where: { id },
    })

    return NextResponse.json({ message: "Playlist deleted successfully" })
  } catch (error) {
    console.error("Error deleting playlist:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
