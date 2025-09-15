import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { id: playlistId } = await params
    const { coverImageUrl } = await request.json()

    // Check if playlist exists and user owns it
    const playlist = await prisma.playlist.findUnique({
      where: { id: playlistId },
      select: { id: true, ownerId: true, isCollaborative: true }
    })

    if (!playlist) {
      return NextResponse.json({ message: 'Playlist not found' }, { status: 404 })
    }

    // Check if user can edit the playlist
    const canEdit = playlist.ownerId === session.user.id || playlist.isCollaborative

    if (!canEdit) {
      return NextResponse.json({ message: 'Permission denied' }, { status: 403 })
    }

    // Update playlist cover
    const updatedPlaylist = await prisma.playlist.update({
      where: { id: playlistId },
      data: { coverImageUrl },
      select: {
        id: true,
        name: true,
        coverImageUrl: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(updatedPlaylist)
  } catch (error) {
    console.error('Error updating playlist cover:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
