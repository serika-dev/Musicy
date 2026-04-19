import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const likedTracks = await prisma.userLike.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        track: {
          select: {
            id: true,
            title: true,
            duration: true,
            filePath: true,
            format: true,
            coverImageUrl: true,
            bitRate: true,
            sampleRate: true,
            genre: true,
            playCount: true,
            createdAt: true,
            artist: {
              select: {
                id: true,
                name: true,
                verified: true,
              },
            },
            album: {
              select: {
                id: true,
                title: true,
                coverImageUrl: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    })

    const total = await prisma.userLike.count({
      where: { userId: session.user.id },
    })

    const tracks = (likedTracks as any).map((like: any) => like.track)

    return NextResponse.json({
      tracks,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    })
  } catch (error) {
    console.error('Error fetching liked songs:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { trackId } = await request.json()
    
    if (!trackId) {
      return NextResponse.json({ message: 'Track ID is required' }, { status: 400 })
    }

    // Check if already liked
    const existingLike = await prisma.userLike.findUnique({
      where: {
        userId_trackId: {
          userId: session.user.id,
          trackId,
        },
      },
    })

    if (existingLike) {
      return NextResponse.json({ message: 'Track already liked' }, { status: 400 })
    }

    // Create the like
    await prisma.userLike.create({
      data: {
        userId: session.user.id,
        trackId,
      },
    })

    return NextResponse.json({ message: 'Track liked successfully' })
  } catch (error) {
    console.error('Error liking track:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const trackId = searchParams.get('trackId')
    
    if (!trackId) {
      return NextResponse.json({ message: 'Track ID is required' }, { status: 400 })
    }

    // Delete the like (using deleteMany to avoid P2025 error if record doesn't exist)
    const result = await prisma.userLike.deleteMany({
      where: {
        userId: session.user.id,
        trackId,
      },
    })

    if (result.count === 0) {
      return NextResponse.json({ message: 'Track was not liked' }, { status: 400 })
    }

    return NextResponse.json({ message: 'Track unliked successfully' })
  } catch (error) {
    console.error('Error unliking track:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
