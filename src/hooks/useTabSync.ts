"use client"

import { useEffect, useRef, useState } from "react"

const TAB_ID_KEY = "musicy:tab-id"
const CHANNEL_NAME = "musicy:tab-sync"

const HEARTBEAT_INTERVAL = 2000
const LEADER_TIMEOUT = 6000
const PRESENCE_TIMEOUT = 8000

function generateTabId(): string {
  return `tab_${Math.random().toString(36).slice(2, 11)}`
}

function getTabId(): string {
  if (typeof window === "undefined") return ""
  let id = sessionStorage.getItem(TAB_ID_KEY)
  if (!id) {
    id = generateTabId()
    sessionStorage.setItem(TAB_ID_KEY, id)
  }
  return id
}

interface LeaderRecord {
  tabId: string
  ts: number
}

interface TabMessage {
  type: "presence" | "elect" | "bye"
  tabId: string
}

/**
 * Leader election for same-device multi-tab support.
 * Only the leader tab plays audio; all tabs receive state via server SSE.
 *
 * Correctness notes:
 * - The whole election runs in ONE effect keyed only on `deviceId`, so it never
 *   tears down/rebuilds on leadership flips (the previous bug that caused two
 *   tabs to play at once).
 * - The source of truth lives in refs; React state is only mirrored for render.
 * - A live leader is never stolen from. When the leader dies, the first writer
 *   wins and every other tab re-reads and follows, guaranteeing a single leader.
 */
export function useTabSync(deviceId: string) {
  const tabIdRef = useRef<string>(getTabId())
  const channelRef = useRef<BroadcastChannel | null>(null)
  const isLeaderRef = useRef(false)
  const presenceRef = useRef<Map<string, number>>(new Map())

  const [isLeader, setIsLeader] = useState(false)
  const [otherTabs, setOtherTabs] = useState<string[]>([])

  useEffect(() => {
    if (!deviceId || typeof window === "undefined") return

    const myTabId = tabIdRef.current
    const leaderKey = `musicy:leader:${deviceId}`

    let channel: BroadcastChannel | null = null
    if (typeof BroadcastChannel !== "undefined") {
      channel = new BroadcastChannel(CHANNEL_NAME)
      channelRef.current = channel
    }

    const readLeader = (): LeaderRecord | null => {
      try {
        const raw = localStorage.getItem(leaderKey)
        return raw ? (JSON.parse(raw) as LeaderRecord) : null
      } catch {
        return null
      }
    }

    const writeLeader = () => {
      try {
        localStorage.setItem(
          leaderKey,
          JSON.stringify({ tabId: myTabId, ts: Date.now() } satisfies LeaderRecord)
        )
      } catch {
        /* ignore quota / disabled storage */
      }
    }

    const setLeader = (value: boolean) => {
      if (isLeaderRef.current !== value) {
        isLeaderRef.current = value
        setIsLeader(value)
      }
    }

    // Single deterministic election step.
    const evaluate = () => {
      const rec = readLeader()
      const now = Date.now()
      const alive = rec ? now - rec.ts < LEADER_TIMEOUT : false

      if (rec && rec.tabId === myTabId) {
        // We hold leadership: refresh heartbeat and keep it.
        writeLeader()
        setLeader(true)
        return
      }

      if (alive) {
        // Another tab is actively leading; never steal from a live leader.
        setLeader(false)
        return
      }

      // No leader or the leader is stale: claim it, then confirm we won.
      writeLeader()
      channel?.postMessage({ type: "elect", tabId: myTabId } satisfies TabMessage)
      const after = readLeader()
      setLeader(after?.tabId === myTabId)
    }

    const prunePresence = () => {
      const now = Date.now()
      let changed = false
      for (const [tid, ts] of presenceRef.current) {
        if (now - ts > PRESENCE_TIMEOUT) {
          presenceRef.current.delete(tid)
          changed = true
        }
      }
      if (changed) setOtherTabs(Array.from(presenceRef.current.keys()))
    }

    const handleMessage = (msg: TabMessage) => {
      if (!msg || msg.tabId === myTabId) return
      if (msg.type === "bye") {
        presenceRef.current.delete(msg.tabId)
        setOtherTabs(Array.from(presenceRef.current.keys()))
        // The leader may have left; re-evaluate promptly.
        evaluate()
        return
      }
      // presence | elect
      const known = presenceRef.current.has(msg.tabId)
      presenceRef.current.set(msg.tabId, Date.now())
      if (!known) setOtherTabs(Array.from(presenceRef.current.keys()))
      if (msg.type === "elect") evaluate()
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === leaderKey) evaluate()
    }

    const handleVisibility = () => {
      if (document.visibilityState === "visible") evaluate()
    }

    if (channel) {
      channel.onmessage = (e) => handleMessage(e.data as TabMessage)
    }
    window.addEventListener("storage", handleStorage)
    document.addEventListener("visibilitychange", handleVisibility)

    // Initial election + periodic heartbeat/presence.
    evaluate()
    channel?.postMessage({ type: "presence", tabId: myTabId } satisfies TabMessage)

    const tick = setInterval(() => {
      evaluate()
      channel?.postMessage({ type: "presence", tabId: myTabId } satisfies TabMessage)
      prunePresence()
    }, HEARTBEAT_INTERVAL)

    const handleUnload = () => {
      channel?.postMessage({ type: "bye", tabId: myTabId } satisfies TabMessage)
      const rec = readLeader()
      if (rec?.tabId === myTabId) {
        try {
          localStorage.removeItem(leaderKey)
        } catch {
          /* ignore */
        }
      }
    }
    window.addEventListener("pagehide", handleUnload)

    return () => {
      clearInterval(tick)
      window.removeEventListener("storage", handleStorage)
      document.removeEventListener("visibilitychange", handleVisibility)
      window.removeEventListener("pagehide", handleUnload)
      handleUnload()
      channel?.close()
      channelRef.current = null
    }
  }, [deviceId])

  return {
    tabId: tabIdRef.current,
    isLeader,
    otherTabs,
  }
}
