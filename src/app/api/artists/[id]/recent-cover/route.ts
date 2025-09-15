import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params

    // Find the most recent album/single with a cover image for this artist
    const recentAlbumWithCover = await prisma.album.findFirst({
      where: {
        artistId: id,
        coverImageUrl: {
          not: null
        }
      },
      select: {
        coverImageUrl: true,
        title: true,
        albumType: true
      },
      orderBy: [
        { createdAt: 'desc' },
        { albumType: 'desc' } // Prefer albums over singles
      ]
    })

    if (!recentAlbumWithCover) {
      return NextResponse.json({ message: 'No album covers found for this artist' }, { status: 404 })
    }

    return NextResponse.json({
      coverImageUrl: recentAlbumWithCover.coverImageUrl,
      albumTitle: recentAlbumWithCover.title,
      albumType: recentAlbumWithCover.albumType
    })
  } catch (error) {
    console.error('Error fetching artist recent cover:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
