import { type NextRequest, NextResponse } from "next/server"
import { getAuthSession } from "@/lib/mobile-auth"
import { prisma } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession(request)

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    // Get recently played tracks from listening history
    const history = await prisma.listeningHistory.findMany({
      where: { userId: session.user.id },
      include: {
        track: {
          select: {
            id: true,
            title: true,
            duration: true,
            coverImageUrl: true,
            filePath: true,
            format: true,
            bitRate: true,
            sampleRate: true,
            genre: true,
            playCount: true,
            artist: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
                verified: true,
              },
            },
            album: {
              select: {
                id: true,
                title: true,
                coverImageUrl: true,
                albumType: true,
              },
            },
          },
        },
      },
      orderBy: { playedAt: "desc" },
      take: 20,
      distinct: ["trackId"],
    })

    const tracks = history.map((h) => h.track)

    return NextResponse.json({
      tracks: JSON.parse(
        JSON.stringify(tracks, (_key, value) =>
          typeof value === "bigint" ? value.toString() : value
        )
      ),
    })
  } catch (error) {
    console.error("Error fetching recently played:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}
