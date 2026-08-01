import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getOnlineDevicesForUser } from "@/lib/devices";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
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
