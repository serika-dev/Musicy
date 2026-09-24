import type { Prisma } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/mobile-auth";

export const dynamic = "force-dynamic";

/**
 * Artist suggestions for onboarding: artists with public music, most followed
 * first, optionally narrowed to the genres the listener just picked.
 */
export async function GET(request: NextRequest) {
  const session = await getAuthSession(request);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim() ?? "";
  const genres = (searchParams.get("genres") ?? "")
    .split(",")
    .map((g) => g.trim())
    .filter(Boolean)
    .slice(0, 20);
  const limit = Math.min(
    Math.max(Number.parseInt(searchParams.get("limit") ?? "30", 10) || 30, 1),
    60,
  );

  const trackFilter: Prisma.TrackWhereInput = { isPublic: true };
  if (genres.length > 0 && !search) {
    trackFilter.OR = [
      { genre: { in: genres } },
      { tags: { some: { genre: { name: { in: genres } } } } },
    ];
  }

  const where: Prisma.ArtistWhereInput = { tracks: { some: trackFilter } };
  if (search) where.name = { contains: search, mode: "insensitive" };

  try {
    const artists = await prisma.artist.findMany({
      where,
      select: {
        id: true,
        name: true,
        imageUrl: true,
        verified: true,
        _count: {
          select: { followers: true, tracks: { where: { isPublic: true } } },
        },
      },
      orderBy: [
        { followers: { _count: "desc" } },
        { verified: "desc" },
        { name: "asc" },
      ],
      take: limit,
    });
    return NextResponse.json({ artists });
  } catch (error) {
    console.error("Error loading onboarding artists:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
