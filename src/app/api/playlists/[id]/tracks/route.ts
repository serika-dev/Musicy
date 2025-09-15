import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

interface RouteContext {
  params: Promise<{ id: string }>
}

// Add track to playlist
export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { id: playlistId } = await params
    const body = await request.json()
    const { trackId } = body

    if (!trackId) {
      return NextResponse.json({ message: "Track ID is required" }, { status: 400 })
    }

    // Check if playlist exists and user has permission
    const playlist = await prisma.playlist.findUnique({
      where: { id: playlistId },
      select: {
        id: true,
        ownerId: true,
        isCollaborative: true,
        collaborators: {
          select: {
            userId: true,
            canEdit: true,
          },
        },
      },
    })

    if (!playlist) {
      return NextResponse.json({ message: "Playlist not found" }, { status: 404 })
    }

    // Check permissions
    const isOwner = playlist.ownerId === session.user.id
    const isCollaborator = playlist.collaborators.some(
      c => c.userId === session.user.id && c.canEdit
    )

    if (!isOwner && !isCollaborator) {
      return NextResponse.json({ message: "Access denied" }, { status: 403 })
    }

    // Check if track exists
    const track = await prisma.track.findUnique({
      where: { id: trackId },
      select: { id: true, isPublic: true },
    })

    if (!track) {
      return NextResponse.json({ message: "Track not found" }, { status: 404 })
    }

    if (!track.isPublic) {
      return NextResponse.json({ message: "Cannot add private track" }, { status: 403 })
    }

    // Check if track is already in playlist
    const existingTrack = await prisma.playlistTrack.findUnique({
      where: {
        playlistId_trackId: {
          playlistId,
          trackId,
        },
      },
    })

    if (existingTrack) {
      return NextResponse.json({ message: "Track already in playlist" }, { status: 409 })
    }

    // Get next position
    const lastTrack = await prisma.playlistTrack.findFirst({
      where: { playlistId },
      orderBy: { position: 'desc' },
      select: { position: true },
    })

    const position = (lastTrack?.position ?? -1) + 1

    // Add track to playlist
    const playlistTrack = await prisma.playlistTrack.create({
      data: {
        playlistId,
        trackId,
        position,
        addedById: session.user.id,
      },
      select: {
        id: true,
        position: true,
        addedAt: true,
        track: {
          select: {
            id: true,
            title: true,
            duration: true,
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
    })

    return NextResponse.json(playlistTrack)
  } catch (error) {
    console.error("Error adding track to playlist:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

// Remove track from playlist
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { id: playlistId } = await params
    const { searchParams } = new URL(request.url)
    const trackId = searchParams.get('trackId')
    const playlistTrackId = searchParams.get('playlistTrackId')

    if (!trackId && !playlistTrackId) {
      return NextResponse.json({ message: "Track ID or playlist track ID is required" }, { status: 400 })
    }

    // Check if playlist exists and user has permission
    const playlist = await prisma.playlist.findUnique({
      where: { id: playlistId },
      select: {
        id: true,
        ownerId: true,
        isCollaborative: true,
        collaborators: {
          select: {
            userId: true,
            canEdit: true,
          },
        },
      },
    })

    if (!playlist) {
      return NextResponse.json({ message: "Playlist not found" }, { status: 404 })
    }

    // Check permissions
    const isOwner = playlist.ownerId === session.user.id
    const isCollaborator = playlist.collaborators.some(
      c => c.userId === session.user.id && c.canEdit
    )

    if (!isOwner && !isCollaborator) {
      return NextResponse.json({ message: "Access denied" }, { status: 403 })
    }

    // Find and delete the playlist track
    const whereClause = playlistTrackId 
      ? { id: playlistTrackId }
      : { playlistId_trackId: { playlistId, trackId: trackId! } }

    const deletedTrack = await prisma.playlistTrack.delete({
      where: whereClause,
    })

    return NextResponse.json({ message: "Track removed from playlist", deletedTrack })
  } catch (error) {
    console.error("Error removing track from playlist:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
