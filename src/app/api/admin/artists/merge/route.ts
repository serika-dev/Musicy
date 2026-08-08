import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// POST: Merge duplicate artists into one
// Body: { sourceArtistId: string, targetArtistId: string }
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
    const { sourceArtistId, targetArtistId } = body

    if (!sourceArtistId || !targetArtistId) {
      return NextResponse.json({ message: 'sourceArtistId and targetArtistId are required' }, { status: 400 })
    }

    if (sourceArtistId === targetArtistId) {
      return NextResponse.json({ message: 'Cannot merge an artist with itself' }, { status: 400 })
    }

    const sourceArtist = await prisma.artist.findUnique({ where: { id: sourceArtistId } })
    const targetArtist = await prisma.artist.findUnique({ where: { id: targetArtistId } })

    if (!sourceArtist || !targetArtist) {
      return NextResponse.json({ message: 'Source or target artist not found' }, { status: 404 })
    }

    // Add source artist name to target's altNames if not already present
    const existingAltNames = targetArtist.altNames || []
    const newAltNames = [...existingAltNames]
    if (sourceArtist.name !== targetArtist.name && !newAltNames.includes(sourceArtist.name)) {
      newAltNames.push(sourceArtist.name)
    }
    // Also merge source altNames
    for (const altName of sourceArtist.altNames || []) {
      if (altName !== targetArtist.name && !newAltNames.includes(altName)) {
        newAltNames.push(altName)
      }
    }

    // Copy over bio, imageUrl, bannerUrl, website if target doesn't have them
    const updateData: any = { altNames: newAltNames }
    if (sourceArtist.bio && !targetArtist.bio) updateData.bio = sourceArtist.bio
    if (sourceArtist.imageUrl && !targetArtist.imageUrl) updateData.imageUrl = sourceArtist.imageUrl
    if (sourceArtist.bannerUrl && !targetArtist.bannerUrl) updateData.bannerUrl = sourceArtist.bannerUrl
    if (sourceArtist.website && !targetArtist.website) updateData.website = sourceArtist.website
    if (sourceArtist.verified && !targetArtist.verified) updateData.verified = true

    await prisma.artist.update({
      where: { id: targetArtistId },
      data: updateData,
    })

    // Move tracks from source to target
    // Handle unique constraint [title, artistId] - if a track with same title exists on target, merge them
    const sourceTracks = await prisma.track.findMany({
      where: { artistId: sourceArtistId },
    })

    let tracksMoved = 0
    let tracksMerged = 0
    for (const srcTrack of sourceTracks) {
      const existingTrack = await prisma.track.findFirst({
        where: {
          title: { equals: srcTrack.title, mode: 'insensitive' },
          artistId: targetArtistId,
        },
      })

      if (existingTrack) {
        // Merge srcTrack into existingTrack
        await mergeTrackRelations(srcTrack.id, existingTrack.id)
        // Sum playCount
        await prisma.track.update({
          where: { id: existingTrack.id },
          data: { playCount: { increment: srcTrack.playCount } },
        })
        await prisma.track.delete({ where: { id: srcTrack.id } })
        tracksMerged++
      } else {
        await prisma.track.update({
          where: { id: srcTrack.id },
          data: { artistId: targetArtistId },
        })
        tracksMoved++
      }
    }

    // Move albums from source to target
    // Handle unique constraint [title, artistId] - if an album with same title exists on target, merge them
    const sourceAlbums = await prisma.album.findMany({
      where: { artistId: sourceArtistId },
    })

    let albumsMoved = 0
    let albumsMerged = 0
    for (const srcAlbum of sourceAlbums) {
      const existingAlbum = await prisma.album.findFirst({
        where: {
          title: { equals: srcAlbum.title, mode: 'insensitive' },
          artistId: targetArtistId,
        },
      })

      if (existingAlbum) {
        // Move tracks from srcAlbum to existingAlbum
        const albumTracks = await prisma.track.findMany({
          where: { albumId: srcAlbum.id },
          select: { id: true },
        })
        if (albumTracks.length > 0) {
          await prisma.track.updateMany({
            where: { id: { in: albumTracks.map(t => t.id) } },
            data: { albumId: existingAlbum.id },
          })
        }
        // Copy cover image if target doesn't have one
        if (srcAlbum.coverImageUrl && !existingAlbum.coverImageUrl) {
          await prisma.album.update({
            where: { id: existingAlbum.id },
            data: { coverImageUrl: srcAlbum.coverImageUrl },
          })
        }
        // Merge featured artists
        const srcFeatured = await prisma.album.findUnique({
          where: { id: srcAlbum.id },
          select: { featuredArtists: { select: { id: true } } },
        })
        if (srcFeatured?.featuredArtists?.length) {
          await prisma.album.update({
            where: { id: existingAlbum.id },
            data: {
              featuredArtists: {
                connect: srcFeatured.featuredArtists.map(fa => ({ id: fa.id })),
              },
            },
          })
        }
        await prisma.album.delete({ where: { id: srcAlbum.id } })
        albumsMerged++
      } else {
        await prisma.album.update({
          where: { id: srcAlbum.id },
          data: { artistId: targetArtistId },
        })
        albumsMoved++
      }
    }

    // Move featured artist relations (tracks where source is a featured artist)
    const featuredInTracks = await prisma.track.findMany({
      where: { featuredArtists: { some: { id: sourceArtistId } } },
      select: { id: true },
    })
    if (featuredInTracks.length > 0) {
      // Disconnect source from all tracks via raw SQL (implicit M2M table)
      await prisma.$executeRaw`DELETE FROM "_TrackFeatures" WHERE "B" = ${sourceArtistId}`
      // Connect target artist to those tracks
      for (const ft of featuredInTracks) {
        await prisma.track.update({
          where: { id: ft.id },
          data: {
            featuredArtists: {
              connect: { id: targetArtistId },
            },
          },
        }).catch(() => {}) // Ignore if already connected
      }
    }

    // Move featured album relations
    const featuredInAlbums = await prisma.album.findMany({
      where: { featuredArtists: { some: { id: sourceArtistId } } },
      select: { id: true },
    })
    if (featuredInAlbums.length > 0) {
      await prisma.$executeRaw`DELETE FROM "_AlbumFeatures" WHERE "B" = ${sourceArtistId}`
      for (const fa of featuredInAlbums) {
        await prisma.album.update({
          where: { id: fa.id },
          data: {
            featuredArtists: {
              connect: { id: targetArtistId },
            },
          },
        }).catch(() => {})
      }
    }

    // Move artist follows
    const sourceFollows = await prisma.artistFollow.findMany({
      where: { artistId: sourceArtistId },
      select: { userId: true },
    })
    for (const follow of sourceFollows) {
      // Check if user already follows target
      const existing = await prisma.artistFollow.findUnique({
        where: {
          userId_artistId: {
            userId: follow.userId,
            artistId: targetArtistId,
          },
        },
      })
      if (!existing) {
        await prisma.artistFollow.create({
          data: { userId: follow.userId, artistId: targetArtistId },
        })
      }
    }
    await prisma.artistFollow.deleteMany({ where: { artistId: sourceArtistId } })

    // Move collab member relations (where source is a collab group)
    const sourceCollabGroups = await prisma.collabMember.findMany({
      where: { collabId: sourceArtistId },
    })
    for (const cm of sourceCollabGroups) {
      const existing = await prisma.collabMember.findUnique({
        where: {
          collabId_memberId: {
            collabId: targetArtistId,
            memberId: cm.memberId,
          },
        },
      })
      if (!existing) {
        await prisma.collabMember.create({
          data: { collabId: targetArtistId, memberId: cm.memberId },
        })
      }
    }
    await prisma.collabMember.deleteMany({ where: { collabId: sourceArtistId } })

    // Move collab member relations (where source is a member)
    const sourceCollabMemberships = await prisma.collabMember.findMany({
      where: { memberId: sourceArtistId },
    })
    for (const cm of sourceCollabMemberships) {
      const existing = await prisma.collabMember.findUnique({
        where: {
          collabId_memberId: {
            collabId: cm.collabId,
            memberId: targetArtistId,
          },
        },
      })
      if (!existing) {
        await prisma.collabMember.create({
          data: { collabId: cm.collabId, memberId: targetArtistId },
        })
      }
    }
    await prisma.collabMember.deleteMany({ where: { memberId: sourceArtistId } })

    // Finally delete the source artist
    await prisma.artist.delete({ where: { id: sourceArtistId } })

    const merged = await prisma.artist.findUnique({
      where: { id: targetArtistId },
      include: {
        _count: {
          select: { tracks: true, albums: true, followers: true },
        },
      },
    })

    return NextResponse.json({
      message: `Successfully merged "${sourceArtist.name}" into "${targetArtist.name}". ${tracksMoved} tracks moved, ${tracksMerged} tracks merged, ${albumsMoved} albums moved, ${albumsMerged} albums merged.`,
      mergedArtist: merged,
      deletedArtist: { id: sourceArtist.id, name: sourceArtist.name },
    })
  } catch (error) {
    console.error('Error merging artists:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

// Helper: move all relations from source track to target track
async function mergeTrackRelations(sourceTrackId: string, targetTrackId: string) {
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

  // Move listening history
  await prisma.listeningHistory.updateMany({
    where: { trackId: sourceTrackId },
    data: { trackId: targetTrackId },
  })

  // Move comments
  await prisma.comment.updateMany({
    where: { trackId: sourceTrackId },
    data: { trackId: targetTrackId },
  })

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

  // Move featured artists
  const sourceFeatured = await prisma.track.findUnique({
    where: { id: sourceTrackId },
    select: { featuredArtists: { select: { id: true } } },
  })
  if (sourceFeatured?.featuredArtists?.length) {
    await prisma.track.update({
      where: { id: targetTrackId },
      data: {
        featuredArtists: {
          connect: sourceFeatured.featuredArtists.map(fa => ({ id: fa.id })),
        },
      },
    })
  }

  // Copy lyrics if target doesn't have them
  const sourceTrack = await prisma.track.findUnique({ where: { id: sourceTrackId } })
  const targetTrack = await prisma.track.findUnique({ where: { id: targetTrackId } })
  if (sourceTrack && targetTrack) {
    const lyricsUpdate: any = {}
    if (!targetTrack.lrcId && sourceTrack.lrcId) lyricsUpdate.lrcId = sourceTrack.lrcId
    if (!targetTrack.plainLyrics && sourceTrack.plainLyrics) lyricsUpdate.plainLyrics = sourceTrack.plainLyrics
    if (!targetTrack.syncedLyrics && sourceTrack.syncedLyrics) lyricsUpdate.syncedLyrics = sourceTrack.syncedLyrics
    if (!targetTrack.romanizedPlain && sourceTrack.romanizedPlain) lyricsUpdate.romanizedPlain = sourceTrack.romanizedPlain
    if (!targetTrack.romanizedSynced && sourceTrack.romanizedSynced) lyricsUpdate.romanizedSynced = sourceTrack.romanizedSynced
    if (!targetTrack.romanizedLanguage && sourceTrack.romanizedLanguage) lyricsUpdate.romanizedLanguage = sourceTrack.romanizedLanguage
    if (Object.keys(lyricsUpdate).length > 0) {
      await prisma.track.update({ where: { id: targetTrackId }, data: lyricsUpdate })
    }
  }
}

// GET: Find duplicate artists
// Detects: exact name matches (case-insensitive), altNames matching another artist's name,
// and romanized/translated variants (e.g. 星街すいせい vs Hoshimachi Suisei)
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

    const allArtists = await prisma.artist.findMany({
      select: {
        id: true,
        name: true,
        altNames: true,
        imageUrl: true,
        verified: true,
        isCollab: true,
        createdAt: true,
        _count: {
          select: { tracks: true, albums: true, followers: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    // Build a lookup: for each artist, what names do they go by?
    // name + altNames all count as "known names"
    const artistNames = new Map<string, { artistId: string; name: string; altNames: string[] }>()
    for (const a of allArtists) {
      artistNames.set(a.id, { artistId: a.id, name: a.name, altNames: a.altNames })
    }

    // Build reverse index: normalized name -> list of artist IDs
    const nameToArtists = new Map<string, string[]>()
    const normalize = (s: string) => s.toLowerCase().trim().replace(/\s+/g, ' ')

    for (const a of allArtists) {
      const names = [a.name, ...(a.altNames || [])]
      for (const n of names) {
        const key = normalize(n)
        if (!nameToArtists.has(key)) nameToArtists.set(key, [])
        if (!nameToArtists.get(key)!.includes(a.id)) {
          nameToArtists.get(key)!.push(a.id)
        }
      }
    }

    // Find groups of duplicates
    const duplicateGroups: Map<string, Set<string>> = new Map() // groupKey -> set of artist IDs

    // Group by shared names
    for (const [name, artistIds] of nameToArtists) {
      if (artistIds.length < 2) continue
      // Find or create a group that contains any of these artists
      let groupKey: string | null = null
      for (const gid of duplicateGroups.keys()) {
        for (const id of artistIds) {
          if (duplicateGroups.get(gid)!.has(id)) {
            groupKey = gid
            break
          }
        }
        if (groupKey) break
      }
      if (!groupKey) {
        groupKey = `group-${duplicateGroups.size}`
        duplicateGroups.set(groupKey, new Set())
      }
      for (const id of artistIds) {
        duplicateGroups.get(groupKey)!.add(id)
      }
    }

    // Also detect romanized variants: if artist A's altNames contains artist B's name or vice versa
    // This is already covered by the name index above

    // Build result
    const groups: any[] = []
    for (const [, artistIds] of duplicateGroups) {
      if (artistIds.size < 2) continue
      const artists = allArtists.filter(a => artistIds.has(a.id))
      // Sort: keep the one with most tracks first (canonical)
      artists.sort((a, b) => b._count.tracks - a._count.tracks || a.createdAt.getTime() - b.createdAt.getTime())
      groups.push({
        artists: artists.map(a => ({
          id: a.id,
          name: a.name,
          altNames: a.altNames,
          imageUrl: a.imageUrl,
          verified: a.verified,
          isCollab: a.isCollab,
          tracks: a._count.tracks,
          albums: a._count.albums,
          followers: a._count.followers,
          createdAt: a.createdAt,
        })),
      })
    }

    return NextResponse.json({
      duplicates: groups,
      totalGroups: groups.length,
      totalArtistsToMerge: groups.reduce((acc, g) => acc + g.artists.length - 1, 0),
    })
  } catch (error) {
    console.error('Error finding duplicate artists:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
