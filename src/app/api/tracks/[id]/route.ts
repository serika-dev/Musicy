import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { validateApiKey } from "@/lib/api-utils"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  const apiKeyUser = await validateApiKey(req)
  if (!session && !apiKeyUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const track = await prisma.track.findUnique({
    where: { id },
    include: { 
      artist: true, 
      album: true,
      _count: { select: { likes: true } }
    }
  })

  if (!track) return NextResponse.json({ error: "Track not found" }, { status: 404 })

  return NextResponse.json({
    ...track,
    fileSize: track.fileSize.toString(),
    external_urls: {
      musicy: `${process.env.NEXT_PUBLIC_APP_URL}/tracks/${track.id}`
    },
    popularity: track.playCount > 100 ? 100 : track.playCount, // Mocked parity
  })
}