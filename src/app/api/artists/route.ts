import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getAuthSession } from "@/lib/mobile-auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession(request)
    
    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const search = searchParams.get('search')

    const whereClause: any = {}

    if (search) {
      // altNames is a String[] which doesn't support mode:insensitive in Prisma
      const queryVariants = [search, search.charAt(0).toUpperCase() + search.slice(1), search.toUpperCase(), search.toLowerCase()]
        .filter((v, i, arr) => arr.indexOf(v) === i)
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { altNames: { hasSome: queryVariants } },
      ]
    }

    const [artists, total] = await Promise.all([
      prisma.artist.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          altNames: true,
          bio: true,
          imageUrl: true,
          verified: true,
          _count: {
            select: {
              tracks: { where: { isPublic: true } },
              albums: { where: { isPublic: true } },
              followers: true,
            },
          },
        },
        orderBy: [
          { verified: 'desc' }, // Verified artists first
          { name: 'asc' },
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
    })
  } catch (error) {
    console.error("Error fetching artists:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}
