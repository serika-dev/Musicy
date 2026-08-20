// In-memory per-user event bus for SSE. Single-instance only (dev).
// For multi-instance production, swap the implementation with Redis pub/sub.

export type SyncEvent =
  | {
      type: "state";
      fromDeviceId: string;
      payload: {
        trackId: string | null;
        // Full track object so controller devices can render now-playing
        // without an extra fetch. Typed loosely here to avoid importing the
        // client Track type into this server-shared module.
        currentTrack: unknown | null;
        isPlaying: boolean;
        currentTime: number;
        duration: number;
        queue: unknown[];
        currentIndex: number;
        shuffle?: boolean;
        repeatMode?: string;
        activeDeviceId: string;
      };
    }
  | {
      type: "command";
      fromDeviceId: string;
      targetDeviceId?: string;
      payload:
        | { action: "play" }
        | { action: "pause" }
        | { action: "toggle" }
        | { action: "next" }
        | { action: "previous" }
        | { action: "seek"; seconds: number }
        | { action: "setVolume"; volume: number }
        | { action: "playTrack"; trackId: string; queue?: unknown[]; index?: number }
        | { action: "shuffle" }
        | { action: "setRepeat"; mode?: string };
    }
  | {
      type: "claim";
      fromDeviceId: string;
      payload: { deviceName: string };
    }
  | {
      type: "device-list";
      payload: {
        devices: Array<{
          id: string;
          name: string;
          isActive: boolean;
          lastSeenAt: string;
        }>;
      };
    }
  | {
      type: "disconnect";
      fromDeviceId: string;
    }
  | {
      type: "autoplay-blocked" | "autoplay-resolved";
      fromDeviceId: string;
      payload: { deviceName: string };
    };

type Subscriber = (event: SyncEvent) => void;

// userId -> set of subscribers
const subscribers = new Map<string, Set<Subscriber>>();

/**
 * Live SSE connections per user.
 * deviceId -> open stream count (tabs on same device share an id, so count > 1).
 */
const liveDevices = new Map<string, Map<string, number>>();

export function subscribe(userId: string, fn: Subscriber): () => void {
  let set = subscribers.get(userId);
  if (!set) {
    set = new Set();
    subscribers.set(userId, set);
  }
  set.add(fn);
  return () => {
    set!.delete(fn);
    if (set!.size === 0) subscribers.delete(userId);
  };
}

export function publish(userId: string, event: SyncEvent): void {
  const set = subscribers.get(userId);
  if (!set) return;
  for (const fn of set) {
    try {
      fn(event);
    } catch (err) {
      console.error("sync-bus subscriber error:", err);
    }
  }
}

export function subscriberCount(userId: string): number {
  return subscribers.get(userId)?.size ?? 0;
}

/** Register an open SSE stream for a device. */
export function registerLiveDevice(userId: string, deviceId: string): void {
  let map = liveDevices.get(userId);
  if (!map) {
    map = new Map();
    liveDevices.set(userId, map);
  }
  map.set(deviceId, (map.get(deviceId) || 0) + 1);
}

/** Unregister when an SSE stream closes. */
export function unregisterLiveDevice(userId: string, deviceId: string): void {
  const map = liveDevices.get(userId);
  if (!map) return;
  const next = (map.get(deviceId) || 1) - 1;
  if (next <= 0) map.delete(deviceId);
  else map.set(deviceId, next);
  if (map.size === 0) liveDevices.delete(userId);
}

/** Device IDs with at least one open SSE stream for this user. */
export function getLiveDeviceIds(userId: string): string[] {
  const map = liveDevices.get(userId);
  if (!map) return [];
  return Array.from(map.keys());
}

export function isDeviceLive(userId: string, deviceId: string): boolean {
  const map = liveDevices.get(userId);
  return !!map && (map.get(deviceId) || 0) > 0;
}
