import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const DAY = 24 * 60 * 60 * 1000;

/** Fill gaps so a chart gets one point per day, oldest first. */
function perDay(rows: { day: Date; n: number }[], days: number, now: Date) {
  const byDay = new Map(
    rows.map((r) => [new Date(r.day).toISOString().slice(0, 10), Number(r.n)]),
  );
  const out: { date: string; value: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * DAY).toISOString().slice(0, 10);
    out.push({ date: d, value: byDay.get(d) ?? 0 });
  }
  return out;
}

/** Platform-wide numbers for the admin overview. */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const since1 = new Date(now.getTime() - DAY);
  const since7 = new Date(now.getTime() - 7 * DAY);
  const since14 = new Date(now.getTime() - 14 * DAY);
  since14.setUTCHours(0, 0, 0, 0);

  try {
    const [
      users,
      usersNew7,
      admins,
      premium,
      tracks,
      tracksPublic,
      tracksNoLyrics,
      renditionsReady,
      renditionsFailed,
      artists,
      artistsVerified,
      albums,
      playlists,
      plays24h,
      plays7d,
      listen7d,
      playsDaily,
      signupsDaily,
      topRaw,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: since7 } } }),
      prisma.user.count({ where: { role: "ADMIN" } }),
      prisma.user.count({ where: { isPremium: true } }),
      prisma.track.count(),
      prisma.track.count({ where: { isPublic: true } }),
      prisma.track.count({ where: { plainLyrics: null, syncedLyrics: null } }),
      prisma.track.count({ where: { renditionStatus: "ready" } }),
      prisma.track.count({ where: { renditionStatus: "failed" } }),
      prisma.artist.count(),
      prisma.artist.count({ where: { verified: true } }),
      prisma.album.count(),
      prisma.playlist.count(),
      prisma.listeningHistory.count({ where: { playedAt: { gte: since1 } } }),
      prisma.listeningHistory.count({ where: { playedAt: { gte: since7 } } }),
      prisma.listeningHistory.aggregate({
        where: { playedAt: { gte: since7 } },
        _sum: { duration: true },
      }),
      prisma.$queryRaw<{ day: Date; n: number }[]>`
        SELECT date_trunc('day', "playedAt") AS day, COUNT(*)::int AS n
        FROM listening_history WHERE "playedAt" >= ${since14}
        GROUP BY 1 ORDER BY 1`,
      prisma.$queryRaw<{ day: Date; n: number }[]>`
        SELECT date_trunc('day', "createdAt") AS day, COUNT(*)::int AS n
        FROM users WHERE "createdAt" >= ${since14}
        GROUP BY 1 ORDER BY 1`,
      prisma.listeningHistory.groupBy({
        by: ["trackId"],
        where: { playedAt: { gte: since7 } },
        _count: { trackId: true },
        orderBy: { _count: { trackId: "desc" } },
        take: 5,
      }),
    ]);

    const topTracksInfo = topRaw.length
      ? await prisma.track.findMany({
          where: { id: { in: topRaw.map((t) => t.trackId) } },
          select: {
            id: true,
            title: true,
            coverImageUrl: true,
            artist: { select: { id: true, name: true } },
            album: { select: { coverImageUrl: true } },
          },
        })
      : [];
    const infoById = new Map(topTracksInfo.map((t) => [t.id, t]));
    const topTracks = topRaw
      .map((t) => {
        const info = infoById.get(t.trackId);
        return info ? { ...info, plays: t._count.trackId } : null;
      })
      .filter(Boolean);

    return NextResponse.json({
      users: { total: users, new7d: usersNew7, admins, premium },
      tracks: {
        total: tracks,
        public: tracksPublic,
        withoutLyrics: tracksNoLyrics,
        renditionsReady,
        renditionsFailed,
      },
      artists: { total: artists, verified: artistsVerified },
      albums: { total: albums },
      playlists: { total: playlists },
      listening: {
        plays24h,
        plays7d,
        hours7d: Math.round(((listen7d._sum.duration ?? 0) / 3600) * 10) / 10,
      },
      series: {
        plays: perDay(playsDaily, 14, now),
        signups: perDay(signupsDaily, 14, now),
      },
      topTracks,
    });
  } catch (error) {
    console.error("Error building admin stats:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
