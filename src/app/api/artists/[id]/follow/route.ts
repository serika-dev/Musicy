import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthSession } from "@/lib/mobile-auth";

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getAuthSession(request)
    
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { id: artistId } = await params

    // Check if artist exists
    const artist = await prisma.artist.findUnique({
      where: { id: artistId }
    })

    if (!artist) {
      return NextResponse.json({ message: 'Artist not found' }, { status: 404 })
    }

    // Check if already following
    const existingFollow = await prisma.artistFollow.findUnique({
      where: {
        userId_artistId: {
          userId: session.user.id,
          artistId: artistId,
        },
      },
    })

    if (existingFollow) {
      return NextResponse.json({ message: 'Already following this artist' }, { status: 400 })
    }

    // Create the follow
    await prisma.artistFollow.create({
      data: {
        userId: session.user.id,
        artistId: artistId,
      },
    })

    return NextResponse.json({ message: 'Artist followed successfully' })
  } catch (error) {
    console.error('Error following artist:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getAuthSession(request)
    
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { id: artistId } = await params

    // Delete the follow
    await prisma.artistFollow.delete({
      where: {
        userId_artistId: {
          userId: session.user.id,
          artistId: artistId,
        },
      },
    })

    return NextResponse.json({ message: 'Artist unfollowed successfully' })
  } catch (error) {
    console.error('Error unfollowing artist:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getAuthSession(request)
    
    if (!session) {
      return NextResponse.json({ isFollowing: false })
    }

    const { id: artistId } = await params

    const follow = await prisma.artistFollow.findUnique({
      where: {
        userId_artistId: {
          userId: session.user.id,
          artistId: artistId,
        },
      },
    })

    return NextResponse.json({ isFollowing: !!follow })
  } catch (error) {
    console.error('Error checking follow status:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
