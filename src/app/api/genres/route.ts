import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET() {
  try {
    // Individual genre tags, ranked by how many public tracks carry them.
    const tagCounts = await prisma.trackTag.groupBy({
      by: ["genreId"],
      where: { track: { isPublic: true } },
      _count: { trackId: true },
      orderBy: { _count: { trackId: "desc" } },
      take: 20,
    })

    const genres = await prisma.genre.findMany({
      where: { id: { in: tagCounts.map((t) => t.genreId) } },
      select: { id: true, name: true },
    })
    const nameById = new Map(genres.map((g) => [g.id, g.name]))

    const result = tagCounts
      .map((t) => ({ name: nameById.get(t.genreId), count: t._count.trackId }))
      .filter((g): g is { name: string; count: number } => Boolean(g.name))

    return NextResponse.json({ genres: result })
  } catch (error) {
    console.error("Error fetching genres:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}
