import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/db"
import { authOptions } from "@/lib/auth"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const model = (prisma as any).systemSetting || (prisma as any).system_setting || (prisma as any).SystemSetting;
    if (!model) {
      console.error("Prisma model 'systemSetting' not found on current prisma instance.");
      return NextResponse.json({ settings: {} }, { status: 500 });
    }

    const settings = await model.findMany()
    const settingsMap = settings.reduce((acc: Record<string, string>, curr: { key: string, value: string }) => {
      acc[curr.key] = curr.value
      return acc
    }, {} as Record<string, string>)

    return NextResponse.json({ settings: settingsMap })
  } catch (error) {
    console.error("Error fetching system settings:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { key, value } = await request.json()

    if (!key) {
      return NextResponse.json({ message: "Key is required" }, { status: 400 })
    }

    const model = (prisma as any).systemSetting || (prisma as any).system_setting || (prisma as any).SystemSetting;
    if (!model) {
       console.error("Prisma model 'systemSetting' not found on current prisma instance.");
       return NextResponse.json({ message: "Internal server error: model not found" }, { status: 500 });
    }

    const setting = await model.upsert({
      where: { key },
      update: { value: String(value) },
      create: { key, value: String(value) },
    })

    return NextResponse.json({ setting })
  } catch (error) {
    console.error("Error updating system setting:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
