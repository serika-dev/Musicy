import { prisma } from "@/lib/db";
import { getLiveDeviceIds, publish } from "@/lib/sync-bus";

/** How long a device may stay offline before we drop the DB row. */
export const DEVICE_STALE_MS = 5 * 60 * 1000;

/**
 * Fetch devices that should appear in the Connect picker:
 * - Must have an open SSE stream right now (live), OR be the currently active player
 * - Dedupes by display name, keeping the freshest / live entry
 * - Prunes ancient rows from the DB as a side effect
 */
export async function getOnlineDevicesForUser(userId: string) {
  const liveIds = new Set(getLiveDeviceIds(userId));

  // Housekeeping: drop rows nobody has touched in a while
  await prisma.device
    .deleteMany({
      where: {
        userId,
        isActive: false,
        lastSeenAt: { lt: new Date(Date.now() - DEVICE_STALE_MS) },
      },
    })
    .catch(() => {});

  const rows = await prisma.device.findMany({
    where: { userId },
    orderBy: { lastSeenAt: "desc" },
  });

  // Only live connections (plus the active player so transfer target is clear)
  const candidates = rows.filter(
    (d) => liveIds.has(d.id) || d.isActive,
  );

  // Dedupe by name: prefer live+active, then live, then most recently seen
  const byName = new Map<string, (typeof candidates)[number]>();
  for (const d of candidates) {
    const key = d.name.trim().toLowerCase() || d.id;
    const existing = byName.get(key);
    if (!existing) {
      byName.set(key, d);
      continue;
    }
    const score = (x: typeof d) =>
      (x.isActive ? 4 : 0) + (liveIds.has(x.id) ? 2 : 0) +
      x.lastSeenAt.getTime() / 1e15;
    if (score(d) > score(existing)) byName.set(key, d);
  }

  // Always surface every live device even if names collide after score —
  // but collapse pure duplicates of the same name when only one is live.
  // If multiple live IDs share a name (rare), keep the active one + most recent live.
  const result = Array.from(byName.values()).sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
    return b.lastSeenAt.getTime() - a.lastSeenAt.getTime();
  });

  return result.map((d) => ({
    id: d.id,
    name: d.name,
    isActive: d.isActive,
    lastSeenAt: d.lastSeenAt.toISOString(),
    live: liveIds.has(d.id),
  }));
}

/** Push a fresh device-list event to all SSE clients for this user. */
export async function broadcastDeviceList(userId: string) {
  const devices = await getOnlineDevicesForUser(userId);
  publish(userId, {
    type: "device-list",
    payload: {
      devices: devices.map(({ id, name, isActive, lastSeenAt }) => ({
        id,
        name,
        isActive,
        lastSeenAt,
      })),
    },
  });
  return devices;
}
