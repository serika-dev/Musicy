import { NextRequest, NextResponse } from "next/server"
import { getAuthSession } from "@/lib/mobile-auth"
import { prisma } from "@/lib/db"
import { getSystemSetting } from "@/lib/settings"
import { DEFAULT_SETTINGS, mergeSettings, type UserSettings } from "@/lib/settings-defaults"

const QUALITIES: UserSettings["audioQuality"][] = ["auto", "low", "medium", "high", "lossless"]
// Values older admin panels stored for DEFAULT_AUDIO_QUALITY.
const LEGACY_QUALITY: Record<string, UserSettings["audioQuality"]> = {
  FLAC_LOSSLESS: "lossless",
  MP3_320K: "high",
  AAC_256K: "high",
  AUTO: "auto",
}

/** The platform default quality, for listeners who never picked one. */
async function platformDefaultQuality(): Promise<UserSettings["audioQuality"]> {
  const raw = await getSystemSetting("DEFAULT_AUDIO_QUALITY", "auto")
  const mapped = LEGACY_QUALITY[raw] ?? raw
  return QUALITIES.includes(mapped as UserSettings["audioQuality"])
    ? (mapped as UserSettings["audioQuality"])
    : "auto"
}

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  const session = await getAuthSession(request)
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
  const row = await prisma.userSettings.findUnique({ where: { userId: session.user.id } })
  const stored = row?.data as Partial<UserSettings> | null
  const settings = mergeSettings(stored)
  if (!stored?.audioQuality) settings.audioQuality = await platformDefaultQuality()
  return NextResponse.json(settings)
}

export async function PUT(request: NextRequest) {
  const session = await getAuthSession(request)
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Invalid body" }, { status: 400 })
  }

  // Only accept known keys
  const allowedKeys = Object.keys(DEFAULT_SETTINGS) as Array<keyof UserSettings>
  const sanitized: Partial<UserSettings> = {}
  for (const k of allowedKeys) {
    if (k in body) (sanitized as Record<string, unknown>)[k] = body[k]
  }
  if ("favoriteGenres" in sanitized) {
    const raw = sanitized.favoriteGenres as unknown
    sanitized.favoriteGenres = Array.isArray(raw)
      ? [...new Set(raw.filter((g): g is string => typeof g === "string" && g.trim().length > 0).map((g) => g.trim().slice(0, 60)))].slice(0, 20)
      : []
  }
  if ("onboardingCompleted" in sanitized) {
    sanitized.onboardingCompleted = sanitized.onboardingCompleted === true
  }

  const existing = await prisma.userSettings.findUnique({ where: { userId: session.user.id } })
  // Store only keys the listener has actually set, so defaults (including the
  // platform's default quality) keep applying to everything else.
  const data = {
    ...((existing?.data as Partial<UserSettings>) ?? {}),
    ...sanitized,
  }

  await prisma.userSettings.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, data: data as unknown as object },
    update: { data: data as unknown as object },
  })

  const merged = mergeSettings(data)
  if (!data.audioQuality) merged.audioQuality = await platformDefaultQuality()
  return NextResponse.json(merged)
}
