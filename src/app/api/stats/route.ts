import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    // Get overall stats (not user-specific since we want to show platform stats)
    const [
      totalTracks,
      totalPlaylists,
      totalArtists,
      totalAlbums,
      recentTracks,
    ] = await Promise.all([
      prisma.track.count({ where: { isPublic: true } }),
      prisma.playlist.count({ where: { isPublic: true } }),
      prisma.artist.count(),
      prisma.album.count({ where: { isPublic: true } }),
      // Get recently added tracks
      prisma.track.findMany({
        where: { isPublic: true },
        select: {
          id: true,
          title: true,
          duration: true,
          filePath: true,
          format: true,
          bitRate: true,
          sampleRate: true,
          genre: true,
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
        orderBy: {
          createdAt: 'desc',
        },
        take: 10,
      }),
    ])

    return NextResponse.json({
      stats: {
        tracks: totalTracks,
        playlists: totalPlaylists,
        artists: totalArtists,
        albums: totalAlbums,
      },
      recentTracks,
    })
  } catch (error) {
    console.error("Error fetching stats:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}
