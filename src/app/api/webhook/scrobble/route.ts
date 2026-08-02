import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { eventName, data } = body

    if (!eventName || !data?.song) {
      return NextResponse.json({ ok: true })
    }

    const song = data.song
    const artist = song.processed?.artist || song.parsed?.artist
    const track = song.processed?.track || song.parsed?.track
    const album = song.processed?.album || song.parsed?.album
    const duration = song.parsed?.duration || song.processed?.duration
    const trackArt = song.parsed?.trackArt || song.metadata?.trackArtUrl

    if (!artist || !track) {
      return NextResponse.json({ ok: true })
    }

    // Try to find the matching track in our database
    const dbTrack = await prisma.track.findFirst({
      where: {
        title: { contains: track, mode: 'insensitive' },
        artist: {
          name: { contains: artist, mode: 'insensitive' },
        },
      },
      select: { id: true },
    })

    if (dbTrack) {
      // Increment play count on scrobble events
      if (eventName === 'scrobble') {
        await prisma.track.update({
          where: { id: dbTrack.id },
          data: { playCount: { increment: 1 } },
        }).catch(() => {})
      }
    }

    // Always return 200 so Web Scrobbler doesn't show errors
    return NextResponse.json({ ok: true })
  } catch {
    // Always return 200 for webhook compatibility
    return NextResponse.json({ ok: true })
  }
}
