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
    const renditionFilter = searchParams.get('renditionFilter')

    let whereClause: any = {}

    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { artist: { name: { contains: search, mode: 'insensitive' } } },
        { album: { title: { contains: search, mode: 'insensitive' } } },
        { genre: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (renditionFilter === 'ready') {
      whereClause.renditionStatus = 'ready'
    } else if (renditionFilter === 'missing') {
      whereClause.OR = [
        ...(whereClause.OR || []),
      ]
      // Override: tracks that do NOT have renditionStatus 'ready'
      delete whereClause.OR
      const searchCondition = whereClause
      whereClause = {
        AND: [
          searchCondition,
          { OR: [
            { renditionStatus: null },
            { renditionStatus: 'pending' },
            { renditionStatus: 'failed' },
            { renditionStatus: 'processing' },
          ] },
        ],
      }
    } else if (renditionFilter === 'failed') {
      whereClause.renditionStatus = 'failed'
    } else if (renditionFilter === 'processing') {
      whereClause.renditionStatus = { in: ['processing', 'pending'] }
    }

    const [tracksRaw, total] = await Promise.all([
      prisma.track.findMany({
        where: whereClause,
        select: {
          id: true,
          title: true,
          duration: true,
          filePath: true,
          fileSize: true,
          bitRate: true,
          sampleRate: true,
          format: true,
          trackNumber: true,
          year: true,
          genre: true,
          playCount: true,
          isPublic: true,
          createdAt: true,
          lrcId: true,
          plainLyrics: true,
          syncedLyrics: true,
          renditionStatus: true,
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
        orderBy: [
          { createdAt: 'desc' },
        ],
        take: limit,
        skip: offset,
      }),
      prisma.track.count({ where: whereClause })
    ])

    // Convert BigInt to string to avoid JSON serialization issues
    const tracks = tracksRaw.map(track => ({
      ...track,
      fileSize: track.fileSize.toString(),
      hasLyrics: !!(track.plainLyrics || track.syncedLyrics),
      hasRenditions: track.renditionStatus === 'ready',
    }))

    return NextResponse.json({
      tracks,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    })
  } catch (error) {
    console.error('Error fetching admin tracks:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
