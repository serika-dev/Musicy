import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 100)
    const offset = Math.max(Number(searchParams.get('offset')) || 0, 0)
    const search = searchParams.get('search')

    let whereClause: any = {}

    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { artist: { name: { contains: search, mode: 'insensitive' } } },
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
          artist: {
            select: {
              id: true,
              name: true,
              verified: true,
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
          { createdAt: 'desc' },
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
    console.error('Error fetching admin albums:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
