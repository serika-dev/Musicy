import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { validateApiKey } from "@/lib/api-utils";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/mobile-auth";
import { getSystemSetting } from "@/lib/settings";
import { after } from "next/server";
import { spawn } from "node:child_process";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Highest → lowest. "auto" maps to "high".
const QUALITY_ORDER = ["lossless", "high", "medium", "low"] as const;
type Quality = (typeof QUALITY_ORDER)[number];

function normalizeQuality(raw: string | null): Quality {
  const q = (raw || "auto").toLowerCase();
  if (q === "auto") return "high";
  if ((QUALITY_ORDER as readonly string[]).includes(q)) return q as Quality;
  return "high";
}

const QUALITY_BITRATE: Record<Quality, number | null> = {
  lossless: null,
  high: 320,
  medium: 192,
  low: 128,
};

/**
 * Resolve the requested quality against available renditions.
 * Fallback chain: exact → next lower tier → next higher tier → original.
 * Returns { url, isOriginal } where isOriginal=true if no rendition matched.
 */
function resolveRendition(
  requested: Quality,
  renditions: { quality: string; filePath: string }[],
  originalFilePath: string,
): { url: string; isOriginal: boolean } {
  const byQuality = new Map(renditions.map((r) => [r.quality, r.filePath]));
  const idx = QUALITY_ORDER.indexOf(requested);

  const exact = byQuality.get(requested);
  if (exact) return { url: exact, isOriginal: false };
  for (let i = idx + 1; i < QUALITY_ORDER.length; i++) {
    const url = byQuality.get(QUALITY_ORDER[i]);
    if (url) return { url, isOriginal: false };
  }
  for (let i = idx - 1; i >= 0; i--) {
    const url = byQuality.get(QUALITY_ORDER[i]);
    if (url) return { url, isOriginal: false };
  }
  return { url: originalFilePath, isOriginal: true };
}

/**
 * Transcode on-the-fly from the source URL to MP3 at the given bitrate.
 * Streams ffmpeg stdout directly to the HTTP response (progressive playback).
 */
function transcodeStream(sourceUrl: string, bitrateKbps: number): ReadableStream {
  const ffmpegBin = process.env.FFMPEG_PATH || "ffmpeg";

  const child = spawn(ffmpegBin, [
    "-hide_banner", "-loglevel", "error",
    "-re",
    "-i", sourceUrl,
    "-c:a", "libmp3lame",
    "-b:a", `${bitrateKbps}k`,
    "-map", "0:a:0",
    "-map_metadata", "0",
    "-vn",
    "-f", "mp3",
    "pipe:1",
  ]);

  return new ReadableStream({
    start(controller) {
      child.stdout.on("data", (chunk: Buffer) => {
        controller.enqueue(new Uint8Array(chunk));
      });
      child.stdout.on("end", () => { try { controller.close(); } catch {} });
      child.stdout.on("error", (err) => { try { controller.error(err); } catch {} });
      child.on("error", (err) => { try { controller.error(err); } catch {} });
      child.on("close", () => { try { controller.close(); } catch {} });
    },
    cancel() {
      child.kill("SIGTERM");
    },
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const requested = normalizeQuality(
    new URL(req.url).searchParams.get("quality"),
  );

  const track = await prisma.track.findUnique({
    where: { id },
    select: {
      id: true,
      isPublic: true,
      filePath: true,
      renditionStatus: true,
      renditions: { select: { quality: true, filePath: true } },
    },
  });

  if (!track || !track.filePath) {
    return NextResponse.json({ error: "Track not found" }, { status: 404 });
  }

  if (!track.isPublic) {
    const session = await getServerSession(authOptions);
    const apiKeyUser = await validateApiKey(req);
    const mobileSession = await getAuthSession(req);
    if (!session && !apiKeyUser && !mobileSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else {
    const allowAnon =
      (await getSystemSetting("ALLOW_ANONYMOUS_PLAYBACK", "true")) === "true";
    if (!allowAnon) {
      const session = await getServerSession(authOptions);
      const apiKeyUser = await validateApiKey(req);
      const mobileSession = await getAuthSession(req);
      if (!session && !apiKeyUser && !mobileSession) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }
  }

  const { url: targetUrl, isOriginal } = resolveRendition(
    requested,
    track.renditions,
    track.filePath,
  );

  // If we have a matching rendition, 302 redirect to it.
  if (!isOriginal) {
    return NextResponse.redirect(targetUrl, {
      status: 302,
      headers: {
        "Cache-Control": "private, max-age=0, must-revalidate",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  // Serving the original file. If user wants lossless, that's correct.
  if (requested === "lossless") {
    return NextResponse.redirect(targetUrl, {
      status: 302,
      headers: {
        "Cache-Control": "private, max-age=0, must-revalidate",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  // User wants lower quality but no rendition exists.
  // Trigger async rendition generation for future plays.
  if (track.renditionStatus !== "processing") {
    after(async () => {
      try {
        const { ensureRenditions } = await import("@/lib/rendition-service");
        await ensureRenditions(track.id);
      } catch (err) {
        console.error(`[stream] async rendition gen failed for ${track.id}:`, err);
      }
    });
  }

  // Transcode on-the-fly for the requested quality.
  const bitrate = QUALITY_BITRATE[requested];
  if (!bitrate) {
    return NextResponse.redirect(targetUrl, {
      status: 302,
      headers: {
        "Cache-Control": "private, max-age=0, must-revalidate",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  try {
    const stream = transcodeStream(track.filePath, bitrate);
    return new Response(stream, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "private, max-age=0, must-revalidate",
        "Access-Control-Allow-Origin": "*",
        "X-Transcoded-On-The-Fly": "true",
        "X-Requested-Quality": requested,
      },
    });
  } catch (err) {
    console.error(`[stream] on-the-fly transcoding failed for ${track.id}:`, err);
    return NextResponse.redirect(targetUrl, {
      status: 302,
      headers: {
        "Cache-Control": "private, max-age=0, must-revalidate",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
}

export async function HEAD(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  return GET(req, ctx);
}
