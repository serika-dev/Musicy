import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// POST: Merge duplicate albums (same title) into one
// Body: { albumTitle: string } or { sourceAlbumId: string, targetAlbumId: string }
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const adminUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })
    if (!adminUser || adminUser.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { albumTitle, sourceAlbumId, targetAlbumId } = body

    let sourceAlbums: any[] = []
    let targetAlbum: any = null

    if (sourceAlbumId && targetAlbumId) {
      // Merge by explicit IDs
      const sourceAlbum = await prisma.album.findUnique({ where: { id: sourceAlbumId } })
      targetAlbum = await prisma.album.findUnique({ where: { id: targetAlbumId } })
      if (!sourceAlbum || !targetAlbum) {
        return NextResponse.json({ message: 'Source or target album not found' }, { status: 404 })
      }
      sourceAlbums = [sourceAlbum]
    } else if (albumTitle) {
      // Merge by title - find all albums with this title
      const albums = await prisma.album.findMany({
        where: {
          title: { equals: albumTitle.trim(), mode: 'insensitive' },
        },
        include: {
          _count: { select: { tracks: true } },
          artist: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'asc' },
      })

      if (albums.length < 2) {
        return NextResponse.json({
          message: `Found ${albums.length} album(s) with title "${albumTitle}". Need at least 2 to merge.`,
          albums: albums.map(a => ({ id: a.id, title: a.title, artist: a.artist.name, tracks: a._count.tracks })),
        }, { status: 400 })
      }

      // The target is the oldest album (first created), or the one with the most tracks
      targetAlbum = albums[0]
      sourceAlbums = albums.slice(1)
    } else {
      return NextResponse.json({ message: 'Provide albumTitle or sourceAlbumId+targetAlbumId' }, { status: 400 })
    }

    // Move all tracks from source albums to the target album
    let totalTracksMoved = 0
    for (const source of sourceAlbums) {
      const tracks = await prisma.track.findMany({
        where: { albumId: source.id },
        select: { id: true },
      })

      if (tracks.length > 0) {
        await prisma.track.updateMany({
          where: { id: { in: tracks.map(t => t.id) } },
          data: { albumId: targetAlbum.id },
        })
        totalTracksMoved += tracks.length
      }

      // Copy cover image if target doesn't have one
      if (source.coverImageUrl && !targetAlbum.coverImageUrl) {
        await prisma.album.update({
          where: { id: targetAlbum.id },
          data: { coverImageUrl: source.coverImageUrl },
        })
        targetAlbum.coverImageUrl = source.coverImageUrl
      }

      // Merge featured artists
      const sourceFeatured = await prisma.album.findUnique({
        where: { id: source.id },
        select: { featuredArtists: { select: { id: true } } },
      })
      if (sourceFeatured?.featuredArtists?.length) {
        await prisma.album.update({
          where: { id: targetAlbum.id },
          data: {
            featuredArtists: {
              connect: sourceFeatured.featuredArtists.map(fa => ({ id: fa.id })),
            },
          },
        })
      }

      // Delete the now-empty source album
      await prisma.album.delete({ where: { id: source.id } })
    }

    // Fetch the final merged album
    const merged = await prisma.album.findUnique({
      where: { id: targetAlbum.id },
      include: {
        artist: { select: { id: true, name: true } },
        _count: { select: { tracks: true } },
      },
    })

    return NextResponse.json({
      message: `Successfully merged ${sourceAlbums.length} duplicate album(s) into "${merged?.title}". ${totalTracksMoved} tracks moved.`,
      mergedAlbum: merged,
      tracksMoved: totalTracksMoved,
      deletedAlbums: sourceAlbums.map(s => ({ id: s.id, title: s.title })),
    })
  } catch (error) {
    console.error('Error merging albums:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

// GET: Find duplicate albums (same title, different IDs)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const adminUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })
    if (!adminUser || adminUser.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    // Find all albums that share a title with at least one other album
    const duplicates = await prisma.album.findMany({
      include: {
        artist: { select: { id: true, name: true } },
        _count: { select: { tracks: true } },
      },
      orderBy: [{ title: 'asc' }, { createdAt: 'asc' }],
    })

    // Group by title (case-insensitive)
    const grouped: Record<string, any[]> = {}
    for (const album of duplicates) {
      const key = album.title.toLowerCase().trim()
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(album)
    }

    // Only return titles that have more than one album
    const duplicateGroups = Object.entries(grouped)
      .filter(([_, albums]) => albums.length > 1)
      .map(([title, albums]) => ({
        title: albums[0].title,
        albums: albums.map(a => ({
          id: a.id,
          title: a.title,
          artist: { id: a.artist.id, name: a.artist.name },
          tracks: a._count.tracks,
          createdAt: a.createdAt,
          coverImageUrl: a.coverImageUrl,
        })),
      }))

    return NextResponse.json({
      duplicates: duplicateGroups,
      totalDuplicateTitles: duplicateGroups.length,
      totalAlbumsToMerge: duplicateGroups.reduce((acc, g) => acc + g.albums.length - 1, 0),
    })
  } catch (error) {
    console.error('Error finding duplicate albums:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
