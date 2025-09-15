import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const limit = Math.min(Number(searchParams.get('limit')) || 20, 100)
    const offset = Math.max(Number(searchParams.get('offset')) || 0, 0)
    const search = searchParams.get('search')
    
    let whereClause: any = {
      isPublic: true
    }
    
    if (search) {
      whereClause.OR = [
        {
          title: {
            contains: search,
            mode: 'insensitive',
          }
        },
        {
          artist: {
            name: {
              contains: search,
              mode: 'insensitive',
            }
          }
        }
      ]
    }

    const [albums, total] = await Promise.all([
      prisma.album.findMany({
        where: whereClause,
        select: {
          id: true,
          title: true,
          description: true,
          coverImageUrl: true,
          releaseDate: true,
          genre: true,
          albumType: true,
          isPublic: true,
          createdAt: true,
          updatedAt: true,
          artist: {
            select: {
              id: true,
              name: true,
              verified: true,
              imageUrl: true,
            },
          },
          _count: {
            select: {
              tracks: {
                where: {
                  isPublic: true
                }
              },
            },
          },
        },
        orderBy: [
          { releaseDate: 'desc' },
          { createdAt: 'desc' }
        ],
        take: limit,
        skip: offset,
      }),
      prisma.album.count({ where: whereClause })
    ])

    return NextResponse.json({
      albums,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    })
  } catch (error) {
    console.error('Error fetching albums:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
