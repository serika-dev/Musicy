import { NextRequest } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { subscribe, publish, type SyncEvent } from "@/lib/sync-bus"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 })
  }
  const userId = session.user.id
  const url = new URL(request.url)
  const deviceId = url.searchParams.get("deviceId")
  if (!deviceId) {
    return new Response("deviceId required", { status: 400 })
  }

  // Make sure this device exists (and bump lastSeenAt)
  await prisma.device.upsert({
    where: { id: deviceId },
    create: {
      id: deviceId,
      userId,
      name: url.searchParams.get("name") || "Unknown Device",
      userAgent: request.headers.get("user-agent") ?? null,
    },
    update: {
      lastSeenAt: new Date(),
      userId, // re-attach if re-used on a different account
    },
  })

  // Build & broadcast updated device list
  const broadcastDeviceList = async () => {
    const devices = await prisma.device.findMany({
      where: {
        userId,
        // Consider devices active within last 2 minutes
        lastSeenAt: { gte: new Date(Date.now() - 2 * 60 * 1000) },
      },
      orderBy: { lastSeenAt: "desc" },
    })
    publish(userId, {
      type: "device-list",
      payload: {
        devices: devices.map(d => ({
          id: d.id,
          name: d.name,
          isActive: d.isActive,
          lastSeenAt: d.lastSeenAt.toISOString(),
        })),
      },
    })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      let closed = false
      const send = (data: string) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(data))
        } catch {
          closed = true
        }
      }

      // Initial hello
      send(`: connected\n\n`)
      send(`event: ready\ndata: ${JSON.stringify({ deviceId })}\n\n`)

      const unsubscribe = subscribe(userId, (event: SyncEvent) => {
        send(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`)
      })

      // Heartbeat & Periodic Refresh
      const heartbeat = setInterval(() => {
        send(`: ping\n\n`)
        // Also bump lastSeenAt
        prisma.device
          .update({
            where: { id: deviceId },
            data: { lastSeenAt: new Date() },
          })
          .catch(() => {})
      }, 20_000)

      // Periodic broadcast of device list to catch stale devices
      const listRefresh = setInterval(() => {
        broadcastDeviceList().catch(() => {})
      }, 60_000)

      // Kick off a device-list broadcast after attaching
      broadcastDeviceList().catch(() => {})

      // Cleanup when client disconnects
      request.signal.addEventListener("abort", async () => {
        closed = true
        clearInterval(heartbeat)
        clearInterval(listRefresh)
        unsubscribe()
        try {
          // Mark inactive if this was the active device, leave record for later
          await prisma.device.update({
            where: { id: deviceId },
            data: { isActive: false },
          })
        } catch {
          // ignore
        }
        publish(userId, { type: "disconnect", fromDeviceId: deviceId })
        broadcastDeviceList().catch(() => {})
        try {
          controller.close()
        } catch {
          // ignore
        }
      })
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}
