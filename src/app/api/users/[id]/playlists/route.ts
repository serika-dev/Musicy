import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const limit = Math.min(Number(searchParams.get('limit')) || 10, 50)
    const offset = Math.max(Number(searchParams.get('offset')) || 0, 0)

    // Only fetch public playlists for user profiles
    const playlists = await prisma.playlist.findMany({
      where: {
        ownerId: id,
        isPublic: true
      },
      select: {
        id: true,
        name: true,
        description: true,
        coverImageUrl: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            tracks: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: limit,
      skip: offset
    })

    const total = await prisma.playlist.count({
      where: {
        ownerId: id,
        isPublic: true
      }
    })

    return NextResponse.json({
      playlists,
      total,
      limit,
      offset,
      hasMore: offset + limit < total
    })
  } catch (error) {
    console.error('Error fetching user playlists:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
