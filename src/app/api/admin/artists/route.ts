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
    const filter = searchParams.get('filter')

    let whereClause: any = {}

    if (search) {
      whereClause.name = {
        contains: search,
        mode: 'insensitive',
      }
    }

    if (filter === 'collab') {
      whereClause.name = {
        ...whereClause.name,
        contains: ' & ',
        mode: 'insensitive',
      }
    } else if (filter === 'solo') {
      whereClause.NOT = {
        name: { contains: ' & ', mode: 'insensitive' }
      }
    }

    const [artists, total] = await Promise.all([
      prisma.artist.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          bio: true,
          imageUrl: true,
          website: true,
          verified: true,
          createdAt: true,
          _count: {
            select: {
              tracks: true,
              albums: true,
              followers: true,
            },
          },
        },
        orderBy: [
          { verified: 'desc' },
          { createdAt: 'desc' },
        ],
        take: limit,
        skip: offset,
      }),
      prisma.artist.count({ where: whereClause })
    ])

    return NextResponse.json({
      artists,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    })
  } catch (error) {
    console.error('Error fetching admin artists:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
