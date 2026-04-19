import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
  const devices = await prisma.device.findMany({
    where: {
      userId: session.user.id,
      lastSeenAt: { gte: new Date(Date.now() - 2 * 60 * 1000) },
    },
    orderBy: { lastSeenAt: "desc" },
  })
  return NextResponse.json({
    devices: devices.map(d => ({
      id: d.id,
      name: d.name,
      userAgent: d.userAgent,
      isActive: d.isActive,
      lastSeenAt: d.lastSeenAt.toISOString(),
    })),
  })
}
