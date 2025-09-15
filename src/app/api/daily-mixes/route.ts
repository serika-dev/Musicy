import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const today = new Date().toISOString().split('T')[0] // Get YYYY-MM-DD format
    
    if (!session?.user?.id) {
      // Return or generate popular mixes for non-authenticated users
      return getOrCreatePopularMixes(today)
    }

    const userId = session.user.id
    
    // Temporarily disable database-stored daily mixes until Prisma is regenerated
    // Create dynamic mixes for now

    // Get user's liked tracks and recent listening history
    const [likedTracks, recentTracks] = await Promise.all([
      prisma.userLike.findMany({
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
      }),
      
      // Get all tracks for discovery mix
      prisma.track.findMany({
        where: { isPublic: true },
        include: {
          artist: { select: { id: true, name: true, verified: true } },
          album: { select: { id: true, title: true, coverImageUrl: true } }
        },
        orderBy: { playCount: 'desc' },
        take: 100
      })
    ])

    const dailyMixes = []

    // Mix 1: Your Liked Songs Mix
    if (likedTracks.length > 0) {
      const shuffledLiked = likedTracks
        .sort(() => Math.random() - 0.5)
        .slice(0, 30)
        .map(like => ({
          ...like.track,
          fileSize: like.track.fileSize.toString()
        }))

      dailyMixes.push({
        id: 'liked-mix',
        name: 'Your Liked Songs Mix',
        description: 'Songs you\'ve liked recently',
        coverImageUrl: shuffledLiked[0]?.album?.coverImageUrl || null,
        tracks: shuffledLiked
      })
    }

    // Mix 2: Discovery Mix
    const shuffledTracks = recentTracks
      .sort(() => Math.random() - 0.5)
      .slice(0, 30)
      .map(track => ({
        ...track,
        fileSize: track.fileSize.toString()
      }))

    dailyMixes.push({
      id: 'discovery-mix',
      name: 'Discovery Mix',
      description: 'Popular tracks you might like',
      coverImageUrl: shuffledTracks[0]?.album?.coverImageUrl || null,
      tracks: shuffledTracks
    })

    // Mix 3: New Releases
    const newReleases = await prisma.track.findMany({
      where: { isPublic: true },
      include: {
        artist: { select: { id: true, name: true, verified: true } },
        album: { select: { id: true, title: true, coverImageUrl: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 30
    })

    if (newReleases.length > 0) {
      dailyMixes.push({
        id: 'new-releases-mix',
        name: 'New Releases',
        description: 'Fresh tracks just added to Musicy',
        coverImageUrl: newReleases[0]?.album?.coverImageUrl || null,
        tracks: newReleases.map(track => ({
          ...track,
          fileSize: track.fileSize.toString()
        }))
      })
    }

    return NextResponse.json(dailyMixes)

  } catch (error) {
    console.error('Error generating daily mixes:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

async function getOrCreatePopularMixes(today: string) {
  try {
    // Create popular mixes dynamically
    const [popularTracks, recentTracks] = await Promise.all([
      prisma.track.findMany({
        where: { isPublic: true },
        include: {
          artist: { select: { id: true, name: true, verified: true } },
          album: { select: { id: true, title: true, coverImageUrl: true } }
        },
        orderBy: { playCount: 'desc' },
        take: 30
      }),
      prisma.track.findMany({
        where: { isPublic: true },
        include: {
          artist: { select: { id: true, name: true, verified: true } },
          album: { select: { id: true, title: true, coverImageUrl: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 30
      })
    ])

    const mixes = [
      {
        id: 'popular-mix',
        name: 'Popular Right Now',
        description: 'The most played tracks on Musicy',
        coverImageUrl: popularTracks[0]?.album?.coverImageUrl || null,
        tracks: popularTracks.map(track => ({
          ...track,
          fileSize: track.fileSize.toString()
        }))
      },
      {
        id: 'new-releases-mix',
        name: 'New Releases',
        description: 'Fresh tracks just added to Musicy',
        coverImageUrl: recentTracks[0]?.album?.coverImageUrl || null,
        tracks: recentTracks.map(track => ({
          ...track,
          fileSize: track.fileSize.toString()
        }))
      }
    ]

    return NextResponse.json(mixes)
  } catch (error) {
    console.error('Error generating popular mixes:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}