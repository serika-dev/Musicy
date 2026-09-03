import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { validateApiKey } from "@/lib/api-utils"

const MIX_SIZE = 50

function todayDate(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function tomorrowDate(): Date {
  const d = todayDate()
  d.setDate(d.getDate() + 1)
  return d
}

function serializeTrack(track: any) {
  return { ...track, fileSize: track.fileSize.toString() }
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

/** How many tracks one artist may contribute to a shared mix. */
const MAX_PER_ARTIST = 3
/** Soft ceilings for the rescue passes, so a sparse or lopsided pool still
 *  fills the mix without handing it back to a single artist. */
const MAX_PER_ARTIST_TOPUP = 8
const MAX_PER_ARTIST_LAST_RESORT = 10

/**
 * Picks up to `limit` tracks with at most [MAX_PER_ARTIST] per artist, so a
 * prolific artist (or one bulk import) can't own an entire mix. The pool is
 * shuffled first, then picked round-robin; if that leaves the mix short, two
 * wider passes top it up — and a catalogue that is genuinely one artist just
 * gets a shorter mix instead of a flooded one.
 */
function diversify<T extends { id: string; artist?: { id: string } | null }>(
  tracks: T[],
  limit: number = MIX_SIZE
): T[] {
  const picked: T[] = []
  const chosen = new Set<string>()
  const perArtist = new Map<string, number>()
  for (const cap of [MAX_PER_ARTIST, MAX_PER_ARTIST_TOPUP, MAX_PER_ARTIST_LAST_RESORT]) {
    for (const track of shuffle(tracks)) {
      if (picked.length >= limit) break
      if (chosen.has(track.id)) continue
      const artistId = track.artist?.id ?? 'none'
      const used = perArtist.get(artistId) ?? 0
      if (used >= cap) continue
      perArtist.set(artistId, used + 1)
      picked.push(track)
      chosen.add(track.id)
    }
    if (picked.length >= limit) break
  }
  return shuffle(picked)
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const apiKeyUser = await validateApiKey(request)

    if (!session?.user?.id && !apiKeyUser) {
      return getOrCreatePopularMixes()
    }

    const userId = session?.user?.id || apiKeyUser?.id
    if (!userId) {
      return getOrCreatePopularMixes()
    }

    const today = todayDate()

    // Check if today's mixes already exist in DB
    const existingMixes = await prisma.dailyMix.findMany({
      where: {
        userId,
        createdDate: today,
        isActive: true,
      },
      include: {
        tracks: {
          orderBy: { position: 'asc' },
          include: {
            track: {
              include: {
                artist: { select: { id: true, name: true, verified: true } },
                album: { select: { id: true, title: true, coverImageUrl: true } },
              },
            },
          },
        },
      },
    })

    if (existingMixes.length > 0) {
      const serialized = existingMixes.map(m => ({
        id: m.id,
        name: m.name,
        description: m.description || '',
        coverImageUrl: m.coverImageUrl,
        tracks: m.tracks.map(mt => serializeTrack(mt.track)),
      }))
      return NextResponse.json(serialized)
    }

    // Generate new mixes for today
    const [likedTracks, popularTracks] = await Promise.all([
      prisma.userLike.findMany({
        where: { userId },
        include: {
          track: {
            include: {
              artist: { select: { id: true, name: true, verified: true } },
              album: { select: { id: true, title: true, coverImageUrl: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      prisma.track.findMany({
        where: { isPublic: true },
        include: {
          artist: { select: { id: true, name: true, verified: true } },
          album: { select: { id: true, title: true, coverImageUrl: true } },
        },
        orderBy: { playCount: 'desc' },
        take: 200,
      }),
    ])

    // Derive user's top genres and artists from liked tracks
    const genreCounts: Record<string, number> = {}
    const artistCounts: Record<string, { id: string; name: string; count: number }> = {}
    for (const like of likedTracks) {
      const g = like.track.genre
      if (g && g.trim()) {
        genreCounts[g] = (genreCounts[g] || 0) + 1
      }
      if (like.track.artist) {
        const a = like.track.artist
        if (!artistCounts[a.id]) {
          artistCounts[a.id] = { id: a.id, name: a.name, count: 0 }
        }
        artistCounts[a.id].count++
      }
    }
    const topGenres = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([g]) => g)
      .slice(0, 3)
    const topArtists = Object.values(artistCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)

    const expiresAt = tomorrowDate()
    const mixesToCreate: {
      mixType: string
      name: string
      description: string
      coverImageUrl: string | null
      tracks: any[]
    }[] = []

    // Mix 1: Liked Songs Mix
    if (likedTracks.length > 0) {
      const shuffled = diversify(likedTracks.map(l => l.track))
      mixesToCreate.push({
        mixType: 'liked',
        name: 'Your Liked Songs Mix',
        description: 'Songs you\'ve liked recently',
        coverImageUrl: shuffled[0]?.album?.coverImageUrl || null,
        tracks: shuffled,
      })
    }

    // Mix 2: Discovery Mix
    {
      const shuffled = diversify(popularTracks)
      mixesToCreate.push({
        mixType: 'discovery',
        name: 'Discovery Mix',
        description: 'Popular tracks you might like',
        coverImageUrl: shuffled[0]?.album?.coverImageUrl || null,
        tracks: shuffled,
      })
    }

    // Mix 3: New Releases
    {
      const newReleases = await prisma.track.findMany({
        where: { isPublic: true },
        include: {
          artist: { select: { id: true, name: true, verified: true } },
          album: { select: { id: true, title: true, coverImageUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
      })
      if (newReleases.length > 0) {
        const picked = diversify(newReleases)
        mixesToCreate.push({
          mixType: 'new-releases',
          name: 'New Releases',
          description: 'Fresh tracks just added to Musicy',
          coverImageUrl: picked[0]?.album?.coverImageUrl || null,
          tracks: picked,
        })
      }
    }

    // Genre-based mixes (up to 3)
    for (const genre of topGenres) {
      const genreTracks = await prisma.track.findMany({
        where: { isPublic: true, genre: { contains: genre, mode: 'insensitive' } },
        include: {
          artist: { select: { id: true, name: true, verified: true } },
          album: { select: { id: true, title: true, coverImageUrl: true } },
        },
        orderBy: { playCount: 'desc' },
        take: 200,
      })
      if (genreTracks.length >= 5) {
        const shuffled = diversify(genreTracks)
        mixesToCreate.push({
          mixType: `genre-${genre.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
          name: `${genre} Mix`,
          description: `More ${genre} tracks for you`,
          coverImageUrl: shuffled[0]?.album?.coverImageUrl || null,
          tracks: shuffled,
        })
      }
    }

    // Artist-based mixes (up to 3)
    for (const artist of topArtists) {
      const artistTracks = await prisma.track.findMany({
        where: { isPublic: true, artistId: artist.id },
        include: {
          artist: { select: { id: true, name: true, verified: true } },
          album: { select: { id: true, title: true, coverImageUrl: true } },
        },
        orderBy: { playCount: 'desc' },
        take: MIX_SIZE,
      })
      if (artistTracks.length >= 5) {
        const shuffled = shuffle(artistTracks).slice(0, MIX_SIZE)
        mixesToCreate.push({
          mixType: `artist-${artist.id}`,
          name: `${artist.name} Mix`,
          description: `Deep dive into ${artist.name}`,
          coverImageUrl: shuffled[0]?.album?.coverImageUrl || null,
          tracks: shuffled,
        })
      }
    }

    // Chill Mix
    {
      const chillTracks = await prisma.track.findMany({
        where: { isPublic: true, OR: [
          { genre: { contains: 'Ambient', mode: 'insensitive' } },
          { genre: { contains: 'Score', mode: 'insensitive' } },
        ] },
        include: {
          artist: { select: { id: true, name: true, verified: true } },
          album: { select: { id: true, title: true, coverImageUrl: true } },
        },
        orderBy: { playCount: 'desc' },
        take: 200,
      })
      if (chillTracks.length >= 5) {
        const shuffled = diversify(chillTracks)
        mixesToCreate.push({
          mixType: 'chill',
          name: 'Chill Mix',
          description: 'Relaxing and ambient sounds',
          coverImageUrl: shuffled[0]?.album?.coverImageUrl || null,
          tracks: shuffled,
        })
      }
    }

    // Persist all mixes to DB
    const createdMixes = []
    for (const mix of mixesToCreate) {
      try {
        const created = await prisma.dailyMix.create({
          data: {
            name: mix.name,
            description: mix.description,
            mixType: mix.mixType,
            coverImageUrl: mix.coverImageUrl,
            createdDate: today,
            expiresAt,
            isActive: true,
            userId,
            tracks: {
              create: mix.tracks.map((track, i) => ({
                trackId: track.id,
                position: i,
              })),
            },
          },
          include: {
            tracks: {
              orderBy: { position: 'asc' },
              include: {
                track: {
                  include: {
                    artist: { select: { id: true, name: true, verified: true } },
                    album: { select: { id: true, title: true, coverImageUrl: true } },
                  },
                },
              },
            },
          },
        })

        createdMixes.push({
          id: created.id,
          name: created.name,
          description: created.description || '',
          coverImageUrl: created.coverImageUrl,
          tracks: created.tracks.map(mt => serializeTrack(mt.track)),
        })
      } catch (err: any) {
        if (err?.code === 'P2002') continue
        throw err
      }
    }

    return NextResponse.json(createdMixes)

  } catch (error) {
    console.error('Error generating daily mixes:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

async function getOrCreatePopularMixes() {
  try {
    const today = todayDate()

    // Check for existing global mixes (userId = null)
    const existing = await prisma.dailyMix.findMany({
      where: {
        userId: null,
        createdDate: today,
        isActive: true,
      },
      include: {
        tracks: {
          orderBy: { position: 'asc' },
          include: {
            track: {
              include: {
                artist: { select: { id: true, name: true, verified: true } },
                album: { select: { id: true, title: true, coverImageUrl: true } },
              },
            },
          },
        },
      },
    })

    if (existing.length > 0) {
      return NextResponse.json(existing.map(m => ({
        id: m.id,
        name: m.name,
        description: m.description || '',
        coverImageUrl: m.coverImageUrl,
        tracks: m.tracks.map(mt => serializeTrack(mt.track)),
      })))
    }

    const [popularTracks, recentTracks] = await Promise.all([
      prisma.track.findMany({
        where: { isPublic: true },
        include: {
          artist: { select: { id: true, name: true, verified: true } },
          album: { select: { id: true, title: true, coverImageUrl: true } },
        },
        orderBy: { playCount: 'desc' },
        take: 200,
      }),
      prisma.track.findMany({
        where: { isPublic: true },
        include: {
          artist: { select: { id: true, name: true, verified: true } },
          album: { select: { id: true, title: true, coverImageUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
    ])

    const popularPicked = diversify(popularTracks)
    const recentPicked = diversify(recentTracks)
    const [jPopPool, chillPool] = await Promise.all([
      prisma.track.findMany({
        where: { isPublic: true, genre: { contains: 'J-Pop', mode: 'insensitive' } },
        include: {
          artist: { select: { id: true, name: true, verified: true } },
          album: { select: { id: true, title: true, coverImageUrl: true } },
        },
        orderBy: { playCount: 'desc' },
        take: 200,
      }),
      prisma.track.findMany({
        where: { isPublic: true, OR: [
          { genre: { contains: 'Ambient', mode: 'insensitive' } },
          { genre: { contains: 'Score', mode: 'insensitive' } },
        ] },
        include: {
          artist: { select: { id: true, name: true, verified: true } },
          album: { select: { id: true, title: true, coverImageUrl: true } },
        },
        orderBy: { playCount: 'desc' },
        take: 200,
      }),
    ])
    const jPopPicked = diversify(jPopPool)
    const chillPicked = diversify(chillPool)

    const expiresAt = tomorrowDate()
    const mixesToCreate = [
      {
        mixType: 'popular',
        name: 'Popular Right Now',
        description: 'The most played tracks on Musicy',
        coverImageUrl: popularPicked[0]?.album?.coverImageUrl || null,
        tracks: popularPicked,
      },
      {
        mixType: 'new-releases',
        name: 'New Releases',
        description: 'Fresh tracks just added to Musicy',
        coverImageUrl: recentPicked[0]?.album?.coverImageUrl || null,
        tracks: recentPicked,
      },
      {
        mixType: 'j-pop',
        name: 'J-Pop Mix',
        description: 'The best of Japanese pop',
        coverImageUrl: jPopPicked[0]?.album?.coverImageUrl || popularTracks[0]?.album?.coverImageUrl || null,
        tracks: jPopPicked,
      },
      {
        mixType: 'chill',
        name: 'Chill Mix',
        description: 'Relaxing and ambient sounds',
        coverImageUrl: chillPicked[0]?.album?.coverImageUrl || null,
        tracks: chillPicked,
      },
    ].filter(m => m.tracks.length >= 5)

    const createdMixes = []
    for (const mix of mixesToCreate) {
      try {
        const created = await prisma.dailyMix.create({
          data: {
            name: mix.name,
            description: mix.description,
            mixType: mix.mixType,
            coverImageUrl: mix.coverImageUrl,
            createdDate: today,
            expiresAt,
            isActive: true,
            userId: null,
            tracks: {
              create: mix.tracks.map((track, i) => ({
                trackId: track.id,
                position: i,
              })),
            },
          },
          include: {
            tracks: {
              orderBy: { position: 'asc' },
              include: {
                track: {
                  include: {
                    artist: { select: { id: true, name: true, verified: true } },
                    album: { select: { id: true, title: true, coverImageUrl: true } },
                  },
                },
              },
            },
          },
        })

        createdMixes.push({
          id: created.id,
          name: created.name,
          description: created.description || '',
          coverImageUrl: created.coverImageUrl,
          tracks: created.tracks.map(mt => serializeTrack(mt.track)),
        })
      } catch (err: any) {
        if (err?.code === 'P2002') continue
        throw err
      }
    }

    return NextResponse.json(createdMixes)
  } catch (error) {
    console.error('Error generating popular mixes:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}