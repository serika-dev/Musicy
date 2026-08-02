import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { trackId, duration, context } = body as {
      trackId: string
      duration?: number
      context?: { type: string; id?: string; name?: string }
    }

    if (!trackId) {
      return NextResponse.json(
        { message: "trackId is required" },
        { status: 400 }
      )
    }

    // Verify track exists
    const track = await prisma.track.findUnique({
      where: { id: trackId },
      select: { id: true, title: true },
    })

    if (!track) {
      return NextResponse.json(
        { message: "Track not found" },
        { status: 404 }
      )
    }

    // Record listening history + increment playCount in a transaction
    await prisma.$transaction([
      prisma.listeningHistory.create({
        data: {
          userId: session.user.id,
          trackId,
          duration: duration || 0,
        },
      }),
      prisma.track.update({
        where: { id: trackId },
        data: { playCount: { increment: 1 } },
      }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error recording play:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}
