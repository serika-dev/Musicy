import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { validateApiKey } from "@/lib/api-utils";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/mobile-auth";
import { getSystemSetting } from "@/lib/settings";

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

/**
 * Resolve the requested quality against available renditions.
 * Fallback chain: exact → next lower tier → next higher tier → original.
 */
function resolveUrl(
  requested: Quality,
  renditions: { quality: string; filePath: string }[],
  originalFilePath: string,
): string {
  const byQuality = new Map(renditions.map((r) => [r.quality, r.filePath]));
  const idx = QUALITY_ORDER.indexOf(requested);

  // exact
  const exact = byQuality.get(requested);
  if (exact) return exact;
  // lower tiers (toward "low")
  for (let i = idx + 1; i < QUALITY_ORDER.length; i++) {
    const url = byQuality.get(QUALITY_ORDER[i]);
    if (url) return url;
  }
  // higher tiers (toward "lossless")
  for (let i = idx - 1; i >= 0; i--) {
    const url = byQuality.get(QUALITY_ORDER[i]);
    if (url) return url;
  }
  // nothing transcoded yet — serve the original
  return originalFilePath;
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
      renditions: { select: { quality: true, filePath: true } },
    },
  });

  if (!track || !track.filePath) {
    return NextResponse.json({ error: "Track not found" }, { status: 404 });
  }

  // Visibility: public tracks stream to anyone (or gated by system setting);
  // private tracks require any form of auth.
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

  const target = resolveUrl(requested, track.renditions, track.filePath);

  // 302 redirect so B2 serves the bytes directly (native HTTP range/seek).
  return NextResponse.redirect(target, {
    status: 302,
    headers: {
      "Cache-Control": "private, max-age=0, must-revalidate",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

export async function HEAD(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  return GET(req, ctx);
}
