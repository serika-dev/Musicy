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
    const search = searchParams.get('search')
    const artistId = searchParams.get('artistId')

    let whereClause: any = {}

    if (search) {
      whereClause.title = {
        contains: search,
        mode: 'insensitive',
      }
    }

    if (artistId) {
      whereClause.artistId = artistId
    }

    const albums = await prisma.album.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
        coverImageUrl: true,
        albumType: true,
        artist: {
          select: {
            id: true,
            name: true,
          }
        },
      },
      orderBy: [
        { title: 'asc' },
      ],
      take: 50, // Limit for dropdown
    })

    return NextResponse.json({ albums })
  } catch (error) {
    console.error('Error fetching albums list:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
