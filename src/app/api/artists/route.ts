import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
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
      whereClause.name = { contains: search, mode: 'insensitive' }
    }

    const [artists, total] = await Promise.all([
      prisma.artist.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
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
