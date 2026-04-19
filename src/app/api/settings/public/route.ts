import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET() {
  try {
    // Only expose specific safe settings to the public
    const publicSettingsKeys = ["allow_registration"]
    
    const model = (prisma as any).systemSetting || (prisma as any).system_setting || (prisma as any).SystemSetting;
    if (!model) {
      return NextResponse.json({ settings: {} });
    }
    
    const settings = await model.findMany({
      where: {
        key: { in: publicSettingsKeys }
      }
    })

    const settingsMap = settings.reduce((acc: Record<string, string>, curr: { key: string, value: string }) => {
      acc[curr.key] = curr.value
      return acc
    }, {} as Record<string, string>)

    return NextResponse.json({ settings: settingsMap })
  } catch (error) {
    console.error("Error fetching public settings:", error)
    return NextResponse.json({ settings: {} })
  }
}
