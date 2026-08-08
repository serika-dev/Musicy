import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ensureRenditions } from "@/lib/rendition-service";
import { after } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/renditions
 * Returns a summary of rendition coverage across the library.
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [total, ready, processing, failed, pending, none] = await Promise.all([
    prisma.track.count(),
    prisma.track.count({ where: { renditionStatus: "ready" } }),
    prisma.track.count({ where: { renditionStatus: "processing" } }),
    prisma.track.count({ where: { renditionStatus: "failed" } }),
    prisma.track.count({ where: { renditionStatus: "pending" } }),
    prisma.track.count({ where: { renditionStatus: null } }),
  ]);

  const totalRenditions = await prisma.trackRendition.count();

  const byQuality = await prisma.trackRendition.groupBy({
    by: ["quality"],
    _count: true,
  });

  return NextResponse.json({
    total,
    coverage: { ready, processing, failed, pending, none },
    totalRenditions,
    byQuality: Object.fromEntries(byQuality.map((q) => [q.quality, q._count])),
  });
}

/**
 * POST /api/admin/renditions
 * Backfills renditions for tracks that are missing them (renditionStatus is
 * null, "failed", or "pending"). Processes sequentially in the background.
 *
 * Body options:
 *   - force?: boolean  — re-generate even for tracks marked "ready"
 *   - limit?: number   — max tracks to process (default: all)
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const force = body?.force === true;
  const limit = body?.limit ? parseInt(body.limit, 10) : undefined;

  const where = force
    ? undefined
    : {
        OR: [
          { renditionStatus: null },
          { renditionStatus: "pending" },
          { renditionStatus: "failed" },
        ],
      };

  const tracks = await prisma.track.findMany({
    where,
    select: { id: true },
    take: limit,
  });

  if (tracks.length === 0) {
    return NextResponse.json({
      message: "No tracks need rendition generation",
      processed: 0,
    });
  }

  const trackIds = tracks.map((t) => t.id);

  // Process sequentially in the background — ffmpeg is CPU-heavy and
  // parallel transcoding would overwhelm the server.
  after(async () => {
    for (const trackId of trackIds) {
      try {
        await ensureRenditions(trackId);
      } catch (err) {
        console.error(`[backfill] failed for ${trackId}:`, err);
      }
    }
    console.log(`[backfill] completed for ${trackIds.length} tracks`);
  });

  return NextResponse.json({
    message: `Started rendition generation for ${trackIds.length} track${trackIds.length === 1 ? "" : "s"}`,
    processed: trackIds.length,
    trackIds,
  });
}
