import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { validateApiKey } from "@/lib/api-utils";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const apiKeyUser = await validateApiKey(req);
  // Allow public access for basic metadata (needed for Embeds)
  // We'll check isPublic later

  const track = await prisma.track.findUnique({
    where: { id },
    include: {
      artist: true,
      album: { include: { featuredArtists: true } },
      featuredArtists: true,
      renditions: {
        select: {
          quality: true,
          format: true,
          bitRate: true,
          fileSize: true,
          filePath: true,
        },
      },
      _count: { select: { likes: true } },
    },
  });

  if (!track)
    return NextResponse.json({ error: "Track not found" }, { status: 404 });

  const isAuthorized = session || apiKeyUser;

  // Check if track is public or user is authorized
  if (!track.isPublic && !isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Mask filePath if not authorized
  const { filePath, renditions, ...trackData } = track;
  const returnedFilePath = isAuthorized ? filePath : undefined;

  // Compact rendition list (URLs only exposed to authorized callers).
  const renditionSummary = renditions.map((r) => ({
    quality: r.quality,
    format: r.format,
    bitRate: r.bitRate,
    fileSize: r.fileSize.toString(),
    url: isAuthorized ? r.filePath : undefined,
  }));

  return NextResponse.json({
    ...trackData,
    filePath: returnedFilePath,
    fileSize: track.fileSize.toString(),
    renditions: renditionSummary,
    streamUrl: `/api/tracks/${track.id}/stream`,
    external_urls: {
      musicy: `${process.env.NEXT_PUBLIC_APP_URL}/tracks/${track.id}`,
    },
    popularity: track.playCount > 100 ? 100 : track.playCount, // Mocked parity
  });
}
