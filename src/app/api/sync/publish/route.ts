import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { broadcastDeviceList } from "@/lib/devices";
import { publish, type SyncEvent } from "@/lib/sync-bus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const body = (await request.json().catch(() => null)) as SyncEvent | null;
  if (!body || !body.type) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  // Refresh the origin device's lastSeenAt if provided
  if ("fromDeviceId" in body && body.fromDeviceId) {
    await prisma.device
      .update({
        where: { id: body.fromDeviceId },
        data: { lastSeenAt: new Date(), userId },
      })
      .catch(() => {});
  }

  // If this is a claim, flip active flags in the DB
  if (body.type === "claim") {
    await prisma.$transaction([
      prisma.device.updateMany({
        where: { userId },
        data: { isActive: false },
      }),
      prisma.device.update({
        where: { id: body.fromDeviceId },
        data: {
          isActive: true,
          name: body.payload.deviceName,
          lastSeenAt: new Date(),
        },
      }),
    ]);
    await broadcastDeviceList(userId);
  }

  publish(userId, body);
  return NextResponse.json({ ok: true });
}
