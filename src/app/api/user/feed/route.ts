import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    const userId = session.user.id

    // Get user's followed artist IDs
    const followed = await prisma.artistFollow.findMany({
      where: { userId },
      select: { artistId: true },
    })
    const followedArtistIds = followed.map((f) => f.artistId)

    // Get user's liked track genres and artist IDs
    const likedTracks = await prisma.userLike.findMany({
      where: { userId },
      include: {
        track: {
          select: {
            id: true,
            genre: true,
            artistId: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    })

    const likedGenres = [
      ...new Set(
        likedTracks
          .map((l) => l.track.genre)
          .filter(Boolean) as string[]
      ),
    ]
    const likedArtistIds = [
      ...new Set(
        likedTracks.map((l) => l.track.artistId).filter(Boolean) as string[]
      ),
    ]

    // Combine followed + liked artists for recommendations
    const relevantArtistIds = [
      ...new Set([...followedArtistIds, ...likedArtistIds]),
    ]

    // 1. New releases from followed artists
    const followedAlbums = followedArtistIds.length > 0
      ? await prisma.album.findMany({
          where: {
            isPublic: true,
            artistId: { in: followedArtistIds },
          },
          select: {
            id: true,
            title: true,
            coverImageUrl: true,
            releaseDate: true,
            albumType: true,
            genre: true,
            artist: {
              select: {
                id: true,
                name: true,
                verified: true,
                imageUrl: true,
              },
            },
            _count: {
              select: {
                tracks: {
                  where: { isPublic: true },
                },
              },
            },
          },
          orderBy: { releaseDate: "desc" },
          take: 12,
        })
      : []

    // 2. Recommended tracks based on liked genres / followed artists / listening history
    // Get recently played track IDs to exclude from recommendations
    const recentHistory = await prisma.listeningHistory.findMany({
      where: { userId },
      select: { trackId: true, track: { select: { genre: true, artistId: true } } },
      orderBy: { playedAt: "desc" },
      take: 50,
    })
    const recentTrackIds = recentHistory.map((h) => h.trackId)
    const recentGenres = [
      ...new Set(
        recentHistory
          .map((h) => h.track.genre)
          .filter(Boolean) as string[]
      ),
    ]
    const recentArtistIds = [
      ...new Set(
        recentHistory
          .map((h) => h.track.artistId)
          .filter(Boolean) as string[]
      ),
    ]

    // Build recommendation query: prioritize tracks from recently played genres/artists
    const recommendationArtistIds = [
      ...new Set([...relevantArtistIds, ...recentArtistIds]),
    ]
    const recommendationGenres = [
      ...new Set([...likedGenres, ...recentGenres]),
    ]

    const recommendedTracks = await prisma.track.findMany({
      where: {
        isPublic: true,
        id: {
          notIn: [
            ...likedTracks.map((l) => l.track.id),
            ...recentTrackIds,
          ],
        },
        ...(recommendationArtistIds.length > 0
          ? { artistId: { in: recommendationArtistIds } }
          : recommendationGenres.length > 0
            ? { genre: { in: recommendationGenres } }
            : {}),
      },
      include: {
        artist: {
          select: { id: true, name: true, verified: true, imageUrl: true },
        },
        album: {
          select: { id: true, title: true, coverImageUrl: true, albumType: true },
        },
      },
      orderBy: { playCount: "desc" },
      take: 10,
    })

    // 3. Recently added tracks (fallback if no recommendations)
    const recentTracks =
      recommendedTracks.length < 5
        ? await prisma.track.findMany({
            where: {
              isPublic: true,
              id: {
                notIn: [
                  ...likedTracks.map((l) => l.track.id),
                  ...recommendedTracks.map((t) => t.id),
                ],
              },
            },
            include: {
              artist: {
                select: { id: true, name: true, verified: true, imageUrl: true },
              },
              album: {
                select: { id: true, title: true, coverImageUrl: true, albumType: true },
              },
            },
            orderBy: { createdAt: "desc" },
            take: 10 - recommendedTracks.length,
          })
        : []

    // 4. Discover albums (not from followed artists, but matching liked genres)
    const discoverAlbums = likedGenres.length > 0 || recentGenres.length > 0
      ? await prisma.album.findMany({
          where: {
            isPublic: true,
            genre: { in: [...likedGenres, ...recentGenres] },
            ...(followedArtistIds.length > 0
              ? { artistId: { notIn: followedArtistIds } }
              : {}),
          },
          select: {
            id: true,
            title: true,
            coverImageUrl: true,
            releaseDate: true,
            albumType: true,
            genre: true,
            artist: {
              select: {
                id: true,
                name: true,
                verified: true,
                imageUrl: true,
              },
            },
            _count: {
              select: {
                tracks: {
                  where: { isPublic: true },
                },
              },
            },
          },
          orderBy: { releaseDate: "desc" },
          take: 12,
        })
      : []

    // 5. Recently played tracks (distinct, for "Jump back in" section)
    const recentlyPlayedHistory = await prisma.listeningHistory.findMany({
      where: { userId },
      include: {
        track: {
          include: {
            artist: {
              select: { id: true, name: true, verified: true, imageUrl: true },
            },
            album: {
              select: { id: true, title: true, coverImageUrl: true, albumType: true },
            },
          },
        },
      },
      orderBy: { playedAt: "desc" },
      take: 30,
      distinct: ["trackId"],
    })
    const recentlyPlayed = recentlyPlayedHistory.map((h) => h.track).slice(0, 12)

    // 6. Top artists from listening history + followed artists (min 6)
    const topArtistIds = [
      ...new Set(
        recentHistory
          .map((h) => h.track.artistId)
          .filter(Boolean) as string[]
      ),
    ].slice(0, 12)

    let topArtists = topArtistIds.length > 0
      ? await prisma.artist.findMany({
          where: { id: { in: topArtistIds } },
          select: {
            id: true,
            name: true,
            imageUrl: true,
            verified: true,
            _count: {
              select: {
                tracks: { where: { isPublic: true } },
                albums: { where: { isPublic: true } },
              },
            },
          },
        })
      : []

    // Backfill with followed artists if we have fewer than 6
    if (topArtists.length < 6 && followedArtistIds.length > 0) {
      const existingIds = new Set(topArtists.map((a) => a.id))
      const followed = await prisma.artist.findMany({
        where: {
          id: {
            in: followedArtistIds.filter((id) => !existingIds.has(id)),
          },
        },
        select: {
          id: true,
          name: true,
          imageUrl: true,
          verified: true,
          _count: {
            select: {
              tracks: { where: { isPublic: true } },
              albums: { where: { isPublic: true } },
            },
          },
        },
        take: 6 - topArtists.length,
      })
      topArtists = [...topArtists, ...followed]
    }

    // 7. Recommended artists (based on liked/listened genres, not already followed)
    const recommendedArtists = recommendationGenres.length > 0
      ? await prisma.artist.findMany({
          where: {
            id: {
              notIn: [...followedArtistIds, ...topArtists.map((a) => a.id)],
            },
            tracks: {
              some: {
                isPublic: true,
                genre: { in: recommendationGenres },
              },
            },
          },
          select: {
            id: true,
            name: true,
            imageUrl: true,
            verified: true,
            _count: {
              select: {
                tracks: { where: { isPublic: true } },
                albums: { where: { isPublic: true } },
              },
            },
          },
          orderBy: {
            followers: { _count: "desc" },
          },
          take: 12,
        })
      : []

    // 8. Popular tracks (most played across platform) for fallback
    const popularTracks = recommendedTracks.length < 5
      ? await prisma.track.findMany({
          where: {
            isPublic: true,
            id: {
              notIn: [
                ...likedTracks.map((l) => l.track.id),
                ...recommendedTracks.map((t) => t.id),
                ...recentTrackIds,
              ],
            },
          },
          include: {
            artist: {
              select: { id: true, name: true, verified: true, imageUrl: true },
            },
            album: {
              select: { id: true, title: true, coverImageUrl: true, albumType: true },
            },
          },
          orderBy: { playCount: "desc" },
          take: 10 - recommendedTracks.length,
        })
      : []

    const serialized = JSON.parse(
      JSON.stringify({
        followedAlbums,
        recommendedTracks: [...recommendedTracks, ...recentTracks, ...popularTracks],
        discoverAlbums,
        likedGenres,
        followedArtistCount: followedArtistIds.length,
        recentlyPlayed,
        topArtists,
        recommendedArtists,
      }, (_key, value) => (typeof value === "bigint" ? value.toString() : value))
    )

    return NextResponse.json(serialized)
  } catch (error) {
    console.error("Error fetching personalized feed:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}
