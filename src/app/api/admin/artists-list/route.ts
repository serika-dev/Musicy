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

    let whereClause: any = {}

    if (search) {
      whereClause.name = {
        contains: search,
        mode: 'insensitive',
      }
    }

    const artists = await prisma.artist.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        verified: true,
        imageUrl: true,
      },
      orderBy: [
        { verified: 'desc' },
        { name: 'asc' },
      ],
      take: 50, // Limit for dropdown
    })

    return NextResponse.json({ artists })
  } catch (error) {
    console.error('Error fetching artists list:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
