import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { setTrackTags } from '@/lib/genres'

// POST: Merge duplicate tracks into one
// Body: { sourceTrackId: string, targetTrackId: string }
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
    const { sourceTrackId, targetTrackId } = body

    if (!sourceTrackId || !targetTrackId) {
      return NextResponse.json({ message: 'sourceTrackId and targetTrackId are required' }, { status: 400 })
    }

    if (sourceTrackId === targetTrackId) {
      return NextResponse.json({ message: 'Cannot merge a track with itself' }, { status: 400 })
    }

    const sourceTrack = await prisma.track.findUnique({ where: { id: sourceTrackId } })
    const targetTrack = await prisma.track.findUnique({ where: { id: targetTrackId } })

    if (!sourceTrack || !targetTrack) {
      return NextResponse.json({ message: 'Source or target track not found' }, { status: 404 })
    }

    // Sum playCount
    await prisma.track.update({
      where: { id: targetTrackId },
      data: { playCount: { increment: sourceTrack.playCount } },
    })

    // Copy metadata if target doesn't have it
    const updateData: any = {}
    if (!targetTrack.coverImageUrl && sourceTrack.coverImageUrl) updateData.coverImageUrl = sourceTrack.coverImageUrl
    if (!targetTrack.bitRate && sourceTrack.bitRate) updateData.bitRate = sourceTrack.bitRate
    if (!targetTrack.sampleRate && sourceTrack.sampleRate) updateData.sampleRate = sourceTrack.sampleRate
    if (!targetTrack.trackNumber && sourceTrack.trackNumber) updateData.trackNumber = sourceTrack.trackNumber
    if (!targetTrack.year && sourceTrack.year) updateData.year = sourceTrack.year
    if (!targetTrack.genre && sourceTrack.genre) updateData.genre = sourceTrack.genre
    if (!targetTrack.lrcId && sourceTrack.lrcId) updateData.lrcId = sourceTrack.lrcId
    if (!targetTrack.plainLyrics && sourceTrack.plainLyrics) updateData.plainLyrics = sourceTrack.plainLyrics
    if (!targetTrack.syncedLyrics && sourceTrack.syncedLyrics) updateData.syncedLyrics = sourceTrack.syncedLyrics
    if (!targetTrack.romanizedPlain && sourceTrack.romanizedPlain) updateData.romanizedPlain = sourceTrack.romanizedPlain
    if (!targetTrack.romanizedSynced && sourceTrack.romanizedSynced) updateData.romanizedSynced = sourceTrack.romanizedSynced
    if (!targetTrack.romanizedLanguage && sourceTrack.romanizedLanguage) updateData.romanizedLanguage = sourceTrack.romanizedLanguage
    if (!targetTrack.albumId && sourceTrack.albumId) updateData.albumId = sourceTrack.albumId

    if (Object.keys(updateData).length > 0) {
      await prisma.track.update({ where: { id: targetTrackId }, data: updateData })
    }
    // The genre column only carries the primary tag, so adopt the source's
    // full tag set when the target had none of its own.
    if (!targetTrack.genre && sourceTrack.genre) {
      await setTrackTags(prisma, targetTrackId, sourceTrack.genre)
    }

    // Merge featured artists (skip any already connected to target)
    const [sourceFeatured, targetFeatured] = await Promise.all([
      prisma.track.findUnique({
        where: { id: sourceTrackId },
        select: { featuredArtists: { select: { id: true } } },
      }),
      prisma.track.findUnique({
        where: { id: targetTrackId },
        select: { featuredArtists: { select: { id: true } } },
      }),
    ])
    if (sourceFeatured?.featuredArtists?.length) {
      const targetIds = new Set(targetFeatured?.featuredArtists?.map(f => f.id) || [])
      const toConnect = sourceFeatured.featuredArtists.filter(fa => !targetIds.has(fa.id))
      if (toConnect.length > 0) {
        await prisma.track.update({
          where: { id: targetTrackId },
          data: {
            featuredArtists: {
              connect: toConnect.map(fa => ({ id: fa.id })),
            },
          },
        }).catch(() => {})
      }
    }

    // Move playlist entries
    const playlistEntries = await prisma.playlistTrack.findMany({
      where: { trackId: sourceTrackId },
    })
    for (const pe of playlistEntries) {
      const existing = await prisma.playlistTrack.findUnique({
        where: {
          playlistId_trackId: {
            playlistId: pe.playlistId,
            trackId: targetTrackId,
          },
        },
      })
      if (!existing) {
        await prisma.playlistTrack.update({
          where: { id: pe.id },
          data: { trackId: targetTrackId },
        })
      } else {
        await prisma.playlistTrack.delete({ where: { id: pe.id } })
      }
    }

    // Move likes
    const likes = await prisma.userLike.findMany({
      where: { trackId: sourceTrackId },
    })
    for (const like of likes) {
      const existing = await prisma.userLike.findUnique({
        where: {
          userId_trackId: {
            userId: like.userId,
            trackId: targetTrackId,
          },
        },
      })
      if (!existing) {
        await prisma.userLike.update({
          where: { id: like.id },
          data: { trackId: targetTrackId },
        })
      } else {
        await prisma.userLike.delete({ where: { id: like.id } })
      }
    }

    // Move listening history (no unique constraints, safe to updateMany)
    await prisma.listeningHistory.updateMany({
      where: { trackId: sourceTrackId },
      data: { trackId: targetTrackId },
    }).catch(() => {})

    // Move comments (no unique constraints, safe to updateMany)
    await prisma.comment.updateMany({
      where: { trackId: sourceTrackId },
      data: { trackId: targetTrackId },
    }).catch(() => {})

    // Move daily mix tracks
    const dailyMixEntries = await prisma.dailyMixTrack.findMany({
      where: { trackId: sourceTrackId },
    })
    for (const dm of dailyMixEntries) {
      const existing = await prisma.dailyMixTrack.findUnique({
        where: {
          mixId_trackId: {
            mixId: dm.mixId,
            trackId: targetTrackId,
          },
        },
      })
      if (!existing) {
        await prisma.dailyMixTrack.update({
          where: { id: dm.id },
          data: { trackId: targetTrackId },
        })
      } else {
        await prisma.dailyMixTrack.delete({ where: { id: dm.id } })
      }
    }

    // Move renditions
    const renditions = await prisma.trackRendition.findMany({
      where: { trackId: sourceTrackId },
    })
    for (const r of renditions) {
      const existing = await prisma.trackRendition.findUnique({
        where: {
          trackId_quality: {
            trackId: targetTrackId,
            quality: r.quality,
          },
        },
      })
      if (!existing) {
        await prisma.trackRendition.update({
          where: { id: r.id },
          data: { trackId: targetTrackId },
        })
      } else {
        await prisma.trackRendition.delete({ where: { id: r.id } })
      }
    }

    // Disconnect source from any featured-artist M2M join tables before delete
    await prisma.$executeRaw`DELETE FROM "_TrackFeatures" WHERE "A" = ${sourceTrackId}`.catch(() => {})

    // Delete the source track
    await prisma.track.delete({ where: { id: sourceTrackId } })

    const merged = await prisma.track.findUnique({
      where: { id: targetTrackId },
      include: {
        artist: { select: { id: true, name: true } },
        album: { select: { id: true, title: true } },
        _count: { select: { likes: true } },
      },
    })

    return NextResponse.json({
      message: `Successfully merged "${sourceTrack.title}" into "${targetTrack.title}".`,
      mergedTrack: merged,
      deletedTrack: { id: sourceTrack.id, title: sourceTrack.title },
    })
  } catch (error) {
    console.error('Error merging tracks:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

// GET: Find duplicate tracks
// Detects: same title + same artist name (case-insensitive), or same title + same album
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

    const allTracks = await prisma.track.findMany({
      select: {
        id: true,
        title: true,
        duration: true,
        format: true,
        bitRate: true,
        playCount: true,
        isPublic: true,
        createdAt: true,
        artist: {
          select: { id: true, name: true },
        },
        album: {
          select: { id: true, title: true, coverImageUrl: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    // Group by normalized title + normalized artist name
    const normalize = (s: string) => s.toLowerCase().trim().replace(/\s+/g, ' ')
    const groups = new Map<string, typeof allTracks>()

    for (const track of allTracks) {
      const titleKey = normalize(track.title)
      const artistKey = normalize(track.artist.name)
      const key = `${titleKey}::${artistKey}`
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(track)
    }

    // Also check for same title + same album (different artists but same album = likely duplicate)
    const albumGroups = new Map<string, typeof allTracks>()
    for (const track of allTracks) {
      if (!track.album) continue
      const titleKey = normalize(track.title)
      const albumKey = normalize(track.album.title)
      const key = `${titleKey}::album::${albumKey}`
      if (!albumGroups.has(key)) albumGroups.set(key, [])
      albumGroups.get(key)!.push(track)
    }

    // Merge groups: union of both grouping strategies
    // Build a union-find structure to merge overlapping groups
    const trackToGroup = new Map<string, string>()
    let groupCounter = 0
    const groupToTracks = new Map<string, Set<string>>()

    function getOrCreateGroup(trackId: string): string {
      if (trackToGroup.has(trackId)) return trackToGroup.get(trackId)!
      const gid = `g${groupCounter++}`
      trackToGroup.set(trackId, gid)
      groupToTracks.set(gid, new Set([trackId]))
      return gid
    }

    function mergeGroups(gid1: string, gid2: string) {
      if (gid1 === gid2) return
      const set1 = groupToTracks.get(gid1)!
      const set2 = groupToTracks.get(gid2)!
      for (const id of set2) {
        set1.add(id)
        trackToGroup.set(id, gid1)
      }
      groupToTracks.delete(gid2)
    }

    for (const [, tracks] of groups) {
      if (tracks.length < 2) continue
      const firstGid = getOrCreateGroup(tracks[0].id)
      for (let i = 1; i < tracks.length; i++) {
        const gid = getOrCreateGroup(tracks[i].id)
        mergeGroups(firstGid, gid)
      }
    }

    for (const [, tracks] of albumGroups) {
      if (tracks.length < 2) continue
      const firstGid = getOrCreateGroup(tracks[0].id)
      for (let i = 1; i < tracks.length; i++) {
        const gid = getOrCreateGroup(tracks[i].id)
        mergeGroups(firstGid, gid)
      }
    }

    // Build result
    const duplicateGroups: any[] = []
    for (const [, trackIds] of groupToTracks) {
      if (trackIds.size < 2) continue
      const tracks = allTracks.filter(t => trackIds.has(t.id))
      // Sort: keep the one with most plays first (canonical)
      tracks.sort((a, b) => b.playCount - a.playCount || a.createdAt.getTime() - b.createdAt.getTime())
      duplicateGroups.push({
        tracks: tracks.map(t => ({
          id: t.id,
          title: t.title,
          duration: t.duration,
          format: t.format,
          bitRate: t.bitRate,
          playCount: t.playCount,
          isPublic: t.isPublic,
          artist: { id: t.artist.id, name: t.artist.name },
          album: t.album ? { id: t.album.id, title: t.album.title, coverImageUrl: t.album.coverImageUrl } : null,
          createdAt: t.createdAt,
        })),
      })
    }

    return NextResponse.json({
      duplicates: duplicateGroups,
      totalGroups: duplicateGroups.length,
      totalTracksToMerge: duplicateGroups.reduce((acc, g) => acc + g.tracks.length - 1, 0),
    })
  } catch (error) {
    console.error('Error finding duplicate tracks:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
