import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/mobile-auth";
import { mergeSettings, type UserSettings } from "@/lib/settings-defaults";

export const dynamic = "force-dynamic";

const QUALITIES: UserSettings["audioQuality"][] = [
  "auto",
  "low",
  "medium",
  "high",
  "lossless",
];

/**
 * Finish onboarding in one round trip: follow the picked artists and store
 * genres + quality in the listener's settings. Also used by "Skip", with
 * empty picks, so the flow never shows again.
 */
export async function POST(request: NextRequest) {
  const session = await getAuthSession(request);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const body = (await request.json().catch(() => null)) as {
    genres?: unknown;
    artistIds?: unknown;
    audioQuality?: unknown;
  } | null;

  const genres = Array.isArray(body?.genres)
    ? [
        ...new Set(
          body.genres
            .filter(
              (g): g is string => typeof g === "string" && g.trim().length > 0,
            )
            .map((g) => g.trim().slice(0, 60)),
        ),
      ].slice(0, 20)
    : [];
  const requestedArtistIds = Array.isArray(body?.artistIds)
    ? [
        ...new Set(
          body.artistIds.filter((a): a is string => typeof a === "string"),
        ),
      ].slice(0, 50)
    : [];
  const audioQuality = QUALITIES.includes(
    body?.audioQuality as UserSettings["audioQuality"],
  )
    ? (body?.audioQuality as UserSettings["audioQuality"])
    : undefined;

  try {
    // Only follow artists that exist, so a stale id can't fail the batch.
    const artists = requestedArtistIds.length
      ? await prisma.artist.findMany({
          where: { id: { in: requestedArtistIds } },
          select: { id: true },
        })
      : [];

    const existing = await prisma.userSettings.findUnique({
      where: { userId },
    });
    // Store only what was chosen; unset keys keep following the defaults.
    const data: Partial<UserSettings> = {
      ...((existing?.data as Partial<UserSettings>) ?? {}),
      onboardingCompleted: true,
      favoriteGenres: genres,
      ...(audioQuality ? { audioQuality } : {}),
    };

    await prisma.$transaction([
      prisma.artistFollow.createMany({
        data: artists.map((a) => ({ userId, artistId: a.id })),
        skipDuplicates: true,
      }),
      prisma.userSettings.upsert({
        where: { userId },
        create: { userId, data: data as unknown as object },
        update: { data: data as unknown as object },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      followed: artists.length,
      settings: mergeSettings(data),
    });
  } catch (error) {
    console.error("Error completing onboarding:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
