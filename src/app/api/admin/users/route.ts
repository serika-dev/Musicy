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
        { email: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
        { displayName: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          isPremium: true,
          role: true,
          createdAt: true,
          _count: {
            select: {
              playlists: true,
              likedTracks: true,
            },
          },
        },
        orderBy: [
          { role: 'desc' }, // Admins first
          { createdAt: 'desc' },
        ],
        take: limit,
        skip: offset,
      }),
      prisma.user.count({ where: whereClause })
    ])

    return NextResponse.json({
      users,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    })
  } catch (error) {
    console.error('Error fetching admin users:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
