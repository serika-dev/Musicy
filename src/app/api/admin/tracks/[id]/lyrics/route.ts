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
    
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const adminUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (!adminUser || adminUser.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const { id } = await params
    const { lrcId, plainLyrics, syncedLyrics } = await request.json()

    // Update track with lyrics data
    const updatedTrack = await prisma.track.update({
      where: { id },
      data: {
        lrcId: lrcId ? parseInt(lrcId) : null,
        plainLyrics: plainLyrics || null,
        syncedLyrics: syncedLyrics || null,
      },
      select: {
        id: true,
        title: true,
        lrcId: true,
        plainLyrics: !!plainLyrics,
        syncedLyrics: !!syncedLyrics,
        artist: {
          select: {
            name: true,
          }
        }
      },
    })

    return NextResponse.json({
      ...updatedTrack,
      message: 'Lyrics updated successfully'
    })
  } catch (error) {
    console.error('Error updating track lyrics:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const adminUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (!adminUser || adminUser.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const { id } = await params

    // Remove lyrics from track
    const updatedTrack = await prisma.track.update({
      where: { id },
      data: {
        lrcId: null,
        plainLyrics: null,
        syncedLyrics: null,
      },
      select: {
        id: true,
        title: true,
      },
    })

    return NextResponse.json({
      ...updatedTrack,
      message: 'Lyrics removed successfully'
    })
  } catch (error) {
    console.error('Error removing track lyrics:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
