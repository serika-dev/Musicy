// In-memory per-user event bus for SSE. Single-instance only (dev).
// For multi-instance production, swap the implementation with Redis pub/sub.

export type SyncEvent =
  | {
      type: "state"
      fromDeviceId: string
      payload: {
        trackId: string | null
        isPlaying: boolean
        currentTime: number
        duration: number
        queue: Array<{ id: string; title: string; artistName?: string }>
        currentIndex: number
        activeDeviceId: string
      }
    }
  | {
      type: "command"
      fromDeviceId: string
      targetDeviceId?: string
      payload:
        | { action: "play" }
        | { action: "pause" }
        | { action: "toggle" }
        | { action: "next" }
        | { action: "previous" }
        | { action: "seek"; seconds: number }
        | { action: "setVolume"; volume: number }
        | { action: "playTrack"; trackId: string }
    }
  | {
      type: "claim"
      fromDeviceId: string
      payload: { deviceName: string }
    }
  | {
      type: "device-list"
      payload: {
        devices: Array<{
          id: string
          name: string
          isActive: boolean
          lastSeenAt: string
        }>
      }
    }
  | {
      type: "disconnect"
      fromDeviceId: string
    }

type Subscriber = (event: SyncEvent) => void

// userId -> set of subscribers
const subscribers = new Map<string, Set<Subscriber>>()

export function subscribe(userId: string, fn: Subscriber): () => void {
  let set = subscribers.get(userId)
  if (!set) {
    set = new Set()
    subscribers.set(userId, set)
  }
  set.add(fn)
  return () => {
    set!.delete(fn)
    if (set!.size === 0) subscribers.delete(userId)
  }
}

export function publish(userId: string, event: SyncEvent): void {
  const set = subscribers.get(userId)
  if (!set) return
  for (const fn of set) {
    try {
      fn(event)
    } catch (err) {
      console.error("sync-bus subscriber error:", err)
    }
  }
}

export function subscriberCount(userId: string): number {
  return subscribers.get(userId)?.size ?? 0
}
