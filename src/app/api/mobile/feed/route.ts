import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/mobile-auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = user.id;
    const { searchParams } = new URL(request.url);
    const featured = searchParams.get("featured") !== "false";

    const followed = await prisma.artistFollow.findMany({
      where: { userId },
      select: { artistId: true },
    });
    const followedArtistIds = followed.map((f) => f.artistId);

    const likedTracks = await prisma.userLike.findMany({
      where: { userId },
      include: {
        track: {
          select: { id: true, genre: true, artistId: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const likedGenres = [
      ...new Set(
        likedTracks.map((l) => l.track.genre).filter(Boolean) as string[],
      ),
    ];
    const likedArtistIds = [
      ...new Set(
        likedTracks.map((l) => l.track.artistId).filter(Boolean) as string[],
      ),
    ];
    const relevantArtistIds = [
      ...new Set([...followedArtistIds, ...likedArtistIds]),
    ];

    const recentHistory = await prisma.listeningHistory.findMany({
      where: { userId },
      select: {
        trackId: true,
        track: { select: { genre: true, artistId: true } },
      },
      orderBy: { playedAt: "desc" },
      take: 50,
    });
    const recentTrackIds = recentHistory.map((h) => h.trackId);
    const recentGenres = [
      ...new Set(
        recentHistory.map((h) => h.track.genre).filter(Boolean) as string[],
      ),
    ];
    const recentArtistIds = [
      ...new Set(
        recentHistory.map((h) => h.track.artistId).filter(Boolean) as string[],
      ),
    ];

    const recommendationArtistIds = [
      ...new Set([...relevantArtistIds, ...recentArtistIds]),
    ];
    const recommendationGenres = [
      ...new Set([...likedGenres, ...recentGenres]),
    ];

    const followedAlbums =
      followedArtistIds.length > 0
        ? await prisma.album.findMany({
            where: { isPublic: true, artistId: { in: followedArtistIds } },
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
              _count: { select: { tracks: { where: { isPublic: true } } } },
            },
            orderBy: { releaseDate: "desc" },
            take: 12,
          })
        : [];

    const recommendedTracks = await prisma.track.findMany({
      where: {
        isPublic: true,
        id: {
          notIn: [...likedTracks.map((l) => l.track.id), ...recentTrackIds],
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
          select: {
            id: true,
            title: true,
            coverImageUrl: true,
            albumType: true,
          },
        },
      },
      orderBy: { playCount: "desc" },
      take: 10,
    });

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
                select: {
                  id: true,
                  name: true,
                  verified: true,
                  imageUrl: true,
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
            orderBy: { createdAt: "desc" },
            take: 10 - recommendedTracks.length,
          })
        : [];

    const discoverAlbums =
      likedGenres.length > 0 || recentGenres.length > 0
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
              _count: { select: { tracks: { where: { isPublic: true } } } },
            },
            orderBy: { releaseDate: "desc" },
            take: 12,
          })
        : [];

    const recentlyPlayedHistory = await prisma.listeningHistory.findMany({
      where: { userId },
      include: {
        track: {
          include: {
            artist: {
              select: { id: true, name: true, verified: true, imageUrl: true },
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
      take: 30,
      distinct: ["trackId"],
    });
    const recentlyPlayed = recentlyPlayedHistory
      .map((h) => h.track)
      .slice(0, 12);

    const topArtistIds = [
      ...new Set(
        recentHistory.map((h) => h.track.artistId).filter(Boolean) as string[],
      ),
    ].slice(0, 12);
    let topArtists =
      topArtistIds.length > 0
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
        : [];

    if (topArtists.length < 6 && followedArtistIds.length > 0) {
      const existingIds = new Set(topArtists.map((a) => a.id));
      const followed = await prisma.artist.findMany({
        where: {
          id: { in: followedArtistIds.filter((id) => !existingIds.has(id)) },
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
      });
      topArtists = [...topArtists, ...followed];
    }

    const recommendedArtists =
      recommendationGenres.length > 0
        ? await prisma.artist.findMany({
            where: {
              id: {
                notIn: [...followedArtistIds, ...topArtists.map((a) => a.id)],
              },
              tracks: {
                some: { isPublic: true, genre: { in: recommendationGenres } },
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
            orderBy: { followers: { _count: "desc" } },
            take: 12,
          })
        : [];

    const popularTracks =
      recommendedTracks.length < 5
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
                select: {
                  id: true,
                  name: true,
                  verified: true,
                  imageUrl: true,
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
            orderBy: { playCount: "desc" },
            take: 10 - recommendedTracks.length,
          })
        : [];

    const newReleases = await prisma.album.findMany({
      where: { isPublic: true },
      select: {
        id: true,
        title: true,
        coverImageUrl: true,
        releaseDate: true,
        albumType: true,
        genre: true,
        artist: {
          select: { id: true, name: true, verified: true, imageUrl: true },
        },
        _count: { select: { tracks: { where: { isPublic: true } } } },
      },
      orderBy: { releaseDate: "desc" },
      take: 12,
    });

    const featuredAlbum = featured
      ? followedAlbums.find((a) => a.coverImageUrl) || newReleases[0] || null
      : null;

    const serialized = JSON.parse(
      JSON.stringify(
        {
          featuredAlbum,
          followedAlbums,
          recommendedTracks: [
            ...recommendedTracks,
            ...recentTracks,
            ...popularTracks,
          ],
          discoverAlbums,
          likedGenres,
          followedArtistCount: followedArtistIds.length,
          recentlyPlayed,
          topArtists,
          recommendedArtists,
          newReleases,
        },
        (_key, value) => (typeof value === "bigint" ? value.toString() : value),
      ),
    );

    return NextResponse.json(serialized);
  } catch (error) {
    console.error("Error fetching mobile feed:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
