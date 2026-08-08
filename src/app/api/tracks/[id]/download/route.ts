import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { validateApiKey } from "@/lib/api-utils";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Accept both browser sessions and API key auth
  const session = await getServerSession(authOptions);
  const apiKeyUser = await validateApiKey(req);
  const mobileSession = await getAuthSession(req);
  const isAuthorized = session || apiKeyUser || mobileSession;

  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const track = await prisma.track.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      filePath: true,
      format: true,
      fileSize: true,
      renditions: { select: { quality: true, format: true, filePath: true } },
    },
  });

  if (!track) {
    return NextResponse.json({ error: "Track not found" }, { status: 404 });
  }

  if (!track.filePath) {
    return NextResponse.json({ error: "No file available" }, { status: 404 });
  }

  // Pick the requested quality rendition (defaults to the original/lossless).
  const requestedQuality = new URL(req.url).searchParams.get("quality");
  const rendition = requestedQuality
    ? track.renditions.find((r) => r.quality === requestedQuality)
    : undefined;
  const sourceUrl = rendition?.filePath || track.filePath;
  const sourceFormat = rendition?.format || track.format;

  // Fetch from B2/R2 and stream back to the client
  const upstream = await fetch(sourceUrl);
  if (!upstream.ok) {
    return NextResponse.json(
      { error: `Upstream error: ${upstream.status}` },
      { status: upstream.status },
    );
  }

  const contentType = upstream.headers.get("content-type") || "audio/mpeg";
  const contentLength = upstream.headers.get("content-length");

  const extension = sourceFormat?.toLowerCase() || "mp3";
  const filename = `${track.title.replace(/[^a-zA-Z0-9]/g, "_")}.${extension}`;

  const headers = new Headers({
    "Content-Type": contentType,
    "Content-Disposition": `inline; filename="${filename}"`,
    "Cache-Control": "private, no-cache",
    "Access-Control-Allow-Origin": "*",
  });

  if (contentLength) {
    headers.set("Content-Length", contentLength);
  }

  return new NextResponse(upstream.body, { status: 200, headers });
}
