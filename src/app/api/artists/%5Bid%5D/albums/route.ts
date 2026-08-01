import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const artist = await prisma.artist.findUnique({
      where: { id },
      select: { id: true, name: true },
    })

    if (!artist) {
      return NextResponse.json({ message: "Artist not found" }, { status: 404 })
    }

    const [albums, total] = await Promise.all([
      prisma.album.findMany({
        where: { artistId: id, isPublic: true },
        select: {
          id: true,
          title: true,
          coverImageUrl: true,
          releaseDate: true,
          albumType: true,
          genre: true,
          description: true,
          _count: {
            select: { tracks: { where: { isPublic: true } } },
          },
        },
        orderBy: { releaseDate: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.album.count({ where: { artistId: id, isPublic: true } }),
    ])

    return NextResponse.json({
      albums,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    })
  } catch (error) {
    console.error("Error fetching artist albums:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
