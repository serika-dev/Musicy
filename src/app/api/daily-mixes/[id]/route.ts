import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Handle dynamic mix IDs (like 'liked-mix', 'discovery-mix', etc.)
    if (id === 'liked-mix') {
      return generateLikedMix(userId)
    } else if (id === 'discovery-mix') {
      return generateDiscoveryMix()
    } else if (id === 'new-releases-mix') {
      return generateNewReleasesMix()
    } else if (id === 'popular-mix') {
      return generatePopularMix()
    }

    // Handle database IDs (if we implement persistent daily mixes later)
    try {
      const dailyMix = await prisma.dailyMix.findUnique({
        where: { id },
        include: {
          tracks: {
            include: {
              track: {
                include: {
                  artist: { select: { id: true, name: true, verified: true } },
                  album: { select: { id: true, title: true, coverImageUrl: true } }
                }
              }
            },
            orderBy: { position: 'asc' }
          },
          user: {
            select: {
              id: true,
              displayName: true,
              username: true
            }
          }
        }
      })

      if (dailyMix) {
        // Check if mix is still active
        if (!dailyMix.isActive || new Date() > dailyMix.expiresAt) {
          return NextResponse.json({ error: 'Daily mix has expired' }, { status: 410 })
        }

        const formattedMix = {
          id: dailyMix.id,
          name: dailyMix.name,
          description: dailyMix.description,
          coverImageUrl: dailyMix.coverImageUrl,
          mixType: dailyMix.mixType,
          createdDate: dailyMix.createdDate,
          expiresAt: dailyMix.expiresAt,
          user: dailyMix.user,
          tracks: dailyMix.tracks.map(mixTrack => ({
            ...mixTrack.track,
            fileSize: mixTrack.track.fileSize.toString()
          }))
        }

        return NextResponse.json(formattedMix)
      }
    } catch {
      console.warn('Database lookup failed, treating as dynamic mix ID')
    }

    return NextResponse.json({ error: 'Daily mix not found' }, { status: 404 })
  } catch (error) {
    console.error('Error fetching daily mix:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Save daily mix as playlist
export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { playlistName, description } = body

    if (!playlistName) {
      return NextResponse.json({ message: 'Playlist name is required' }, { status: 400 })
    }

    // Get the daily mix data first
    const mixResponse = await GET(request, { params })
    const mixData = await mixResponse.json()

    if (!mixResponse.ok) {
      return NextResponse.json({ message: 'Failed to get mix data' }, { status: 400 })
    }

    // Create playlist with the mix tracks
    const playlist = await prisma.playlist.create({
      data: {
        name: playlistName,
        description: description || `Saved from ${mixData.name}`,
        ownerId: session.user.id,
        isPublic: true,
        coverImageUrl: mixData.coverImageUrl,
        tracks: {
          create: mixData.tracks.map((track: { id: string }, index: number) => ({
            trackId: track.id,
            position: index,
            addedById: session.user.id,
          }))
        }
      },
      select: {
        id: true,
        name: true,
        description: true,
        coverImageUrl: true,
        _count: {
          select: {
            tracks: true
          }
        }
      }
    })

    return NextResponse.json({
      message: 'Daily mix saved as playlist successfully',
      playlist
    })
  } catch (error) {
    console.error('Error saving daily mix as playlist:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

// Generate liked songs mix
async function generateLikedMix(userId: string) {
  const likedTracks = await prisma.userLike.findMany({
    where: { userId },
    include: {
      track: {
        include: {
          artist: { select: { id: true, name: true, verified: true } },
          album: { select: { id: true, title: true, coverImageUrl: true } }
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 50
  })

  const shuffledTracks = likedTracks
    .sort(() => Math.random() - 0.5)
    .slice(0, 30)
    .map(like => ({
      ...like.track,
      fileSize: like.track.fileSize.toString()
    }))

  return NextResponse.json({
    id: 'liked-mix',
    name: 'Your Liked Songs Mix',
    description: 'Songs you\'ve liked recently',
    mixType: 'liked',
    coverImageUrl: shuffledTracks[0]?.album?.coverImageUrl || null,
    tracks: shuffledTracks,
    createdDate: new Date().toISOString().split('T')[0],
    canSave: true
  })
}

// Generate discovery mix
async function generateDiscoveryMix() {
  const tracks = await prisma.track.findMany({
    where: { isPublic: true },
    include: {
      artist: { select: { id: true, name: true, verified: true } },
      album: { select: { id: true, title: true, coverImageUrl: true } }
    },
    orderBy: { playCount: 'desc' },
    take: 100
  })

  const shuffledTracks = tracks
    .sort(() => Math.random() - 0.5)
    .slice(0, 30)
    .map(track => ({
      ...track,
      fileSize: track.fileSize.toString()
    }))

  return NextResponse.json({
    id: 'discovery-mix',
    name: 'Discovery Mix',
    description: 'Popular tracks you might like',
    mixType: 'discovery',
    coverImageUrl: shuffledTracks[0]?.album?.coverImageUrl || null,
    tracks: shuffledTracks,
    createdDate: new Date().toISOString().split('T')[0],
    canSave: true
  })
}

// Generate new releases mix
async function generateNewReleasesMix() {
  const tracks = await prisma.track.findMany({
    where: { isPublic: true },
    include: {
      artist: { select: { id: true, name: true, verified: true } },
      album: { select: { id: true, title: true, coverImageUrl: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: 30
  })

  const tracksWithFileSize = tracks.map(track => ({
    ...track,
    fileSize: track.fileSize.toString()
  }))

  return NextResponse.json({
    id: 'new-releases-mix',
    name: 'New Releases',
    description: 'Fresh tracks just added to Musicy',
    mixType: 'new-releases',
    coverImageUrl: tracks[0]?.album?.coverImageUrl || null,
    tracks: tracksWithFileSize,
    createdDate: new Date().toISOString().split('T')[0],
    canSave: true
  })
}

// Generate popular mix
async function generatePopularMix() {
  const tracks = await prisma.track.findMany({
    where: { isPublic: true },
    include: {
      artist: { select: { id: true, name: true, verified: true } },
      album: { select: { id: true, title: true, coverImageUrl: true } }
    },
    orderBy: { playCount: 'desc' },
    take: 30
  })

  const tracksWithFileSize = tracks.map(track => ({
    ...track,
    fileSize: track.fileSize.toString()
  }))

  return NextResponse.json({
    id: 'popular-mix',
    name: 'Popular Right Now',
    description: 'The most played tracks on Musicy',
    mixType: 'popular',
    coverImageUrl: tracks[0]?.album?.coverImageUrl || null,
    tracks: tracksWithFileSize,
    createdDate: new Date().toISOString().split('T')[0],
    canSave: true
  })
}