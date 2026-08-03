import { NextRequest, NextResponse } from "next/server"
import { getAuthSession } from "@/lib/mobile-auth"
import { prisma } from "@/lib/db"
import { DEFAULT_SETTINGS, mergeSettings, type UserSettings } from "@/lib/settings-defaults"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  const session = await getAuthSession(request)
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
  const row = await prisma.userSettings.findUnique({ where: { userId: session.user.id } })
  const settings = mergeSettings(row?.data as Partial<UserSettings> | null)
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

  const existing = await prisma.userSettings.findUnique({ where: { userId: session.user.id } })
  const merged = mergeSettings({
    ...((existing?.data as Partial<UserSettings>) ?? {}),
    ...sanitized,
  })

  const saved = await prisma.userSettings.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, data: merged as unknown as object },
    update: { data: merged as unknown as object },
  })

  return NextResponse.json(saved.data)
}
