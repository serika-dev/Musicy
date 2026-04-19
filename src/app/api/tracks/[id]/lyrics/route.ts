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
        id: true,
        title: true,
        lrcId: true,
        plainLyrics: true,
        syncedLyrics: true,
        artist: { select: { name: true } },
        duration: true,
      },
    })

    if (!track) {
      return NextResponse.json({ message: 'Track not found' }, { status: 404 })
    }

    // If lyrics exist in DB, return them
    if (track.plainLyrics || track.syncedLyrics) {
      return NextResponse.json({
        lrcId: track.lrcId,
        plainLyrics: track.plainLyrics,
        syncedLyrics: track.syncedLyrics,
      })
    }

    // Auto-fetch from LRCLib API
    const artistName = track.artist.name
    const trackName = track.title
    const duration = track.duration

    try {
      // Try direct get first (most accurate)
      const getUrl = new URL('https://lrclib.net/api/get')
      getUrl.searchParams.set('artist_name', artistName)
      getUrl.searchParams.set('track_name', trackName)
      if (duration) getUrl.searchParams.set('duration', String(duration))

      const lrcResponse = await fetch(getUrl.toString(), {
        headers: { 'User-Agent': 'SerikaMusic/1.0' },
      })

      if (lrcResponse.ok) {
        const lrcData = await lrcResponse.json()
        if (lrcData && (lrcData.plainLyrics || lrcData.syncedLyrics)) {
          // Cache in DB
          await prisma.track.update({
            where: { id: track.id },
            data: {
              lrcId: lrcData.id || null,
              plainLyrics: lrcData.plainLyrics || null,
              syncedLyrics: lrcData.syncedLyrics || null,
            },
          })
          return NextResponse.json({
            lrcId: lrcData.id,
            plainLyrics: lrcData.plainLyrics,
            syncedLyrics: lrcData.syncedLyrics,
          })
        }
      }

      // Fallback: search endpoint
      const searchUrl = new URL('https://lrclib.net/api/search')
      searchUrl.searchParams.set('artist_name', artistName)
      searchUrl.searchParams.set('track_name', trackName)

      const searchResponse = await fetch(searchUrl.toString(), {
        headers: { 'User-Agent': 'SerikaMusic/1.0' },
      })

      if (searchResponse.ok) {
        const results = await searchResponse.json()
        if (Array.isArray(results) && results.length > 0) {
          const match = results.find((r: any) => r.plainLyrics || r.syncedLyrics)
          if (match) {
            await prisma.track.update({
              where: { id: track.id },
              data: {
                lrcId: match.id || null,
                plainLyrics: match.plainLyrics || null,
                syncedLyrics: match.syncedLyrics || null,
              },
            })
            return NextResponse.json({
              lrcId: match.id,
              plainLyrics: match.plainLyrics,
              syncedLyrics: match.syncedLyrics,
            })
          }
        }
      }
    } catch (lrcError) {
      console.error('LRCLib fetch failed:', lrcError)
    }

    return NextResponse.json({ message: 'No lyrics available' }, { status: 404 })
  } catch (error) {
    console.error('Error fetching track lyrics:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
