import { type NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/mobile-auth";
import { getOnlineDevicesForUser } from "@/lib/devices";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getAuthSession(request);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const devices = await getOnlineDevicesForUser(session.user.id);
  return NextResponse.json({
    devices: devices.map(({ id, name, isActive, lastSeenAt }) => ({
      id,
      name,
      isActive,
      lastSeenAt,
    })),
  });
}
