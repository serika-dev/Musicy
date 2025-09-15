import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params

    const track = await prisma.track.findUnique({
      where: { id },
      select: {
        lrcId: true,
        plainLyrics: true,
        syncedLyrics: true,
      },
    })

    if (!track) {
      return NextResponse.json({ message: 'Track not found' }, { status: 404 })
    }

    // If no lyrics data exists, return 404
    if (!track.lrcId && !track.plainLyrics && !track.syncedLyrics) {
      return NextResponse.json({ message: 'No lyrics available for this track' }, { status: 404 })
    }

    return NextResponse.json({
      lrcId: track.lrcId,
      plainLyrics: track.plainLyrics,
      syncedLyrics: track.syncedLyrics,
    })
  } catch (error) {
    console.error('Error fetching track lyrics:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
