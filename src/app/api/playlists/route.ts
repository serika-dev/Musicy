import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const createPlaylistSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  isPublic: z.boolean().default(false),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const { searchParams } = new URL(request.url)
    
    const limit = Math.min(Number(searchParams.get('limit')) || 10, 50)
    const offset = Math.max(Number(searchParams.get('offset')) || 0, 0)
    const userOnly = searchParams.get('userOnly') === 'true'
    
    let whereClause = {}
    
    if (userOnly && session) {
      whereClause = { ownerId: session.user.id }
    } else {
      whereClause = { isPublic: true }
    }

    const [playlists, total] = await Promise.all([
      prisma.playlist.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          description: true,
          coverImageUrl: true,
          isPublic: true,
          isCollaborative: true,
          createdAt: true,
          updatedAt: true,
          owner: {
            select: {
              id: true,
              username: true,
              displayName: true,
            },
          },
          _count: {
            select: {
              tracks: true,
              likes: true,
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
        take: limit,
        skip: offset,
      }),
      prisma.playlist.count({ where: whereClause })
    ])

    return NextResponse.json({
      playlists,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    })
  } catch (error) {
    console.error('Error fetching playlists:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createPlaylistSchema.parse(body)

    const playlist = await prisma.playlist.create({
      data: {
        ...validatedData,
        ownerId: session.user.id,
      },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
        _count: {
          select: {
            tracks: true,
            likes: true,
          },
        },
      },
    })

    return NextResponse.json(playlist, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 })
    }
    console.error('Error creating playlist:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}