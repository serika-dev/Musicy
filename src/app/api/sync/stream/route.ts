import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { broadcastDeviceList } from "@/lib/devices";
import { getAuthSession } from "@/lib/mobile-auth";
import {
  getLastState,
  isDeviceLive,
  publish,
  registerLiveDevice,
  subscribe,
  type SyncEvent,
  unregisterLiveDevice,
} from "@/lib/sync-bus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getAuthSession(request);
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }
  const userId = session.user.id;
  const url = new URL(request.url);
  const deviceId = url.searchParams.get("deviceId");
  if (!deviceId) {
    return new Response("deviceId required", { status: 400 });
  }

  const deviceName = url.searchParams.get("name") || "Unknown Device";
  const userAgent = request.headers.get("user-agent") ?? null;

  // Upsert this connection as a known device and refresh presence
  await prisma.device.upsert({
    where: { id: deviceId },
    create: {
      id: deviceId,
      userId,
      name: deviceName,
      userAgent,
    },
    update: {
      lastSeenAt: new Date(),
      userId,
      name: deviceName,
      userAgent,
    },
  });

  registerLiveDevice(userId, deviceId);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      const send = (data: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(data));
        } catch {
          closed = true;
        }
      };

      send(`: connected\n\n`);
      send(`event: ready\ndata: ${JSON.stringify({ deviceId })}\n\n`);

      // A device that connects mid-playback has missed every "state" tick
      // so far; the active device only broadcasts on its own schedule, with
      // no way for a new listener to ask for a snapshot. Replay the last
      // known state immediately so this device shows the right track and
      // controls right away instead of waiting on (or missing) the next
      // broadcast — unless this connection belongs to the active device
      // itself, which already knows its own state.
      const cachedState = getLastState(userId);
      if (cachedState && cachedState.fromDeviceId !== deviceId) {
        send(`event: ${cachedState.type}\ndata: ${JSON.stringify(cachedState)}\n\n`);
      }

      const unsubscribe = subscribe(userId, (event: SyncEvent) => {
        send(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
      });

      // Heartbeat keeps the stream alive and proves presence
      const heartbeat = setInterval(() => {
        send(`: ping\n\n`);
        prisma.device
          .updateMany({
            where: { id: deviceId },
            data: { lastSeenAt: new Date() },
          })
          .catch(() => {});
      }, 20_000);

      // Refresh list periodically so everyone drops gone peers
      const listRefresh = setInterval(() => {
        broadcastDeviceList(userId).catch(() => {});
      }, 30_000);

      broadcastDeviceList(userId).catch(() => {});

      const cleanup = async () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        clearInterval(listRefresh);
        unsubscribe();
        unregisterLiveDevice(userId, deviceId);

        try {
          // Drop the row when the last stream for this id closes so ghosts
          // don't linger in the picker. Active flag is cleared first.
          await prisma.device.updateMany({
            where: { id: deviceId },
            data: { isActive: false, lastSeenAt: new Date(0) },
          });
          // If no other live stream holds this id, delete the record
          if (!isDeviceLive(userId, deviceId)) {
            await prisma.device
              .deleteMany({ where: { id: deviceId } })
              .catch(() => {});
          }
        } catch {
          // ignore
        }

        publish(userId, { type: "disconnect", fromDeviceId: deviceId });
        broadcastDeviceList(userId).catch(() => {});
        try {
          controller.close();
        } catch {
          // ignore
        }
      };

      request.signal.addEventListener("abort", () => {
        cleanup().catch(() => {});
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
