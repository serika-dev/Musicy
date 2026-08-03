import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/mobile-auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const likedTracks = await prisma.userLike.findMany({
      where: { userId: user.id },
      include: {
        track: {
          select: {
            id: true,
            title: true,
            duration: true,
            filePath: true,
            format: true,
            coverImageUrl: true,
            bitRate: true,
            sampleRate: true,
            genre: true,
            playCount: true,
            createdAt: true,
            artist: {
              select: { id: true, name: true, verified: true },
            },
            album: {
              select: { id: true, title: true, coverImageUrl: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    const total = await prisma.userLike.count({
      where: { userId: user.id },
    });

    const tracks = likedTracks.map((like: { track: unknown }) => like.track);

    return NextResponse.json({
      tracks: JSON.parse(
        JSON.stringify(tracks, (_key, value) =>
          typeof value === "bigint" ? value.toString() : value,
        ),
      ),
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    });
  } catch (error) {
    console.error("Error fetching mobile liked songs:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
