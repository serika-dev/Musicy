import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { validateApiKey } from "@/lib/api-utils"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  const apiKeyUser = await validateApiKey(req)
  // Allow public access for basic metadata (needed for Embeds)
  // We'll check isPublic later

  const track = await prisma.track.findUnique({
    where: { id },
    include: { 
      artist: true, 
      album: true,
      _count: { select: { likes: true } }
    }
  })

  if (!track) return NextResponse.json({ error: "Track not found" }, { status: 404 })

  // Check if track is public or user is authorized
  if (!track.isPublic && !session && !apiKeyUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  return NextResponse.json({
    ...track,
    fileSize: track.fileSize.toString(),
    external_urls: {
      musicy: `${process.env.NEXT_PUBLIC_APP_URL}/tracks/${track.id}`
    },
    popularity: track.playCount > 100 ? 100 : track.playCount, // Mocked parity
  })
}