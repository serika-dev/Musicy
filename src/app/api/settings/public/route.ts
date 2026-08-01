import { NextResponse } from "next/server";
import { getAllSystemSettings } from "@/lib/settings";

export async function GET() {
  try {
    const settingsMap = await getAllSystemSettings();
    return NextResponse.json({ settings: settingsMap });
  } catch (error) {
    console.error("Error fetching public settings:", error);
    return NextResponse.json({ settings: {} });
  }
}
