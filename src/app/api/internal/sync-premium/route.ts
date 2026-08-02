import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

const INTERNAL_SERVICE_KEY = process.env.AUTH_SERVICE_INTERNAL_KEY || process.env.INTERNAL_SERVICE_KEY || "serika-internal-auth-key-change-in-production"

export async function POST(req: NextRequest) {
  try {
    const serviceKey = req.headers.get("x-service-key")
    if (serviceKey !== INTERNAL_SERVICE_KEY) {
      return NextResponse.json({ error: "Invalid service key", success: false }, { status: 401 })
    }

    const { email, isPremium, subscriptionStatus } = await req.json()

    if (!email) {
      return NextResponse.json({ error: "email is required", success: false }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found", success: false }, { status: 404 })
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isPremium: !!isPremium,
        subscriptionStatus: subscriptionStatus || null,
      },
    })

    console.log(`[Internal] Premium status synced for ${email}: isPremium=${isPremium}, status=${subscriptionStatus}`)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error syncing premium status:", error)
    return NextResponse.json({ error: "Internal server error", success: false }, { status: 500 })
  }
}
