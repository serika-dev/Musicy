import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET() {
  try {
    // Get all distinct genres from public tracks, with count
    const genres = await prisma.track.groupBy({
      by: ["genre"],
      where: {
        isPublic: true,
        genre: { not: null },
      },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 20,
    })

    const result = genres
      .filter((g) => g.genre)
      .map((g) => ({
        name: g.genre,
        count: g._count.id,
      }))

    return NextResponse.json({ genres: result })
  } catch (error) {
    console.error("Error fetching genres:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}
