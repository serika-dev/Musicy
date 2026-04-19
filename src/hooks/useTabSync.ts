"use client"

import { useEffect, useRef, useState } from "react"

const TAB_ID_KEY = "musicy:tab-id"
const CHANNEL_NAME = "musicy:tab-sync"

function generateTabId(): string {
  return "tab_" + Math.random().toString(36).slice(2, 11)
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

interface TabMessage {
  type: "heartbeat" | "leader-check"
  tabId: string
  timestamp: number
}

/**
 * Leader election for same-device multi-tab support.
 * Only the leader tab plays audio. All tabs receive state via server SSE.
 */
export function useTabSync(deviceId: string) {
  const tabId = useRef<string>(getTabId())
  const channelRef = useRef<BroadcastChannel | null>(null)
  const [isLeader, setIsLeader] = useState(false)
  const [otherTabs, setOtherTabs] = useState<string[]>([])

  // Leader election: first tab to claim leadership wins
  useEffect(() => {
    if (!deviceId) return

    // Try BroadcastChannel first, fallback to localStorage events
    let channel: BroadcastChannel | null = null
    if (typeof BroadcastChannel !== "undefined") {
      channel = new BroadcastChannel(CHANNEL_NAME)
      channelRef.current = channel
    }

    const leaderKey = `musicy:leader:${deviceId}`
    const heartbeatKey = `musicy:heartbeat:${deviceId}`
    const myTabId = tabId.current

    // Check current leader
    const checkLeader = () => {
      const currentLeader = localStorage.getItem(leaderKey)
      if (!currentLeader) {
        // No leader, claim it
        claimLeadership()
      } else if (currentLeader === myTabId) {
        setIsLeader(true)
      } else {
        setIsLeader(false)
        // Check if leader is still alive
        const lastHeartbeat = parseInt(localStorage.getItem(`${heartbeatKey}:${currentLeader}`) || "0")
        if (Date.now() - lastHeartbeat > 5000) {
          // Leader is dead, claim it
          claimLeadership()
        }
      }
    }

    const claimLeadership = () => {
      localStorage.setItem(leaderKey, myTabId)
      setIsLeader(true)
      broadcast({ type: "leader-check", tabId: myTabId })
    }

    const sendHeartbeat = () => {
      if (isLeader) {
        localStorage.setItem(`${heartbeatKey}:${myTabId}`, Date.now().toString())
      }
    }

    // Handle incoming messages
    const handleMessage = (data: TabMessage) => {
      if (data.tabId === myTabId) return // Ignore own messages

      switch (data.type) {
        case "leader-check":
          // Another tab claims leadership
          if (isLeader && data.tabId < myTabId) {
            // Tie-breaker: lexicographically smaller tab ID wins
            setIsLeader(false)
          }
          setOtherTabs(prev => prev.includes(data.tabId) ? prev : [...prev, data.tabId])
          break
        case "heartbeat":
          setOtherTabs(prev => prev.includes(data.tabId) ? prev : [...prev, data.tabId])
          break
      }
    }

    // BroadcastChannel handler
    if (channel) {
      channel.onmessage = (e) => handleMessage(e.data as TabMessage)
    }

    // localStorage fallback handler (also catches BC events for redundancy)
    const handleStorage = (e: StorageEvent) => {
      if (e.key?.startsWith("musicy:tab-msg:")) {
        try {
          const data = JSON.parse(e.newValue || "{}") as TabMessage
          handleMessage(data)
        } catch {
          // ignore
        }
      }
    }
    window.addEventListener("storage", handleStorage)

    // Initial leader check and heartbeat interval
    checkLeader()
    const heartbeatInterval = setInterval(() => {
      sendHeartbeat()
      checkLeader()
    }, 2000)

    // Cleanup other tabs that haven't sent heartbeat
    const cleanupInterval = setInterval(() => {
      setOtherTabs(prev => {
        const now = Date.now()
        return prev.filter(tid => {
          const lastBeat = parseInt(localStorage.getItem(`${heartbeatKey}:${tid}`) || "0")
          return now - lastBeat < 10000
        })
      })
    }, 5000)

    // Claim leadership on load if none exists
    if (!localStorage.getItem(leaderKey)) {
      claimLeadership()
    }

    return () => {
      window.removeEventListener("storage", handleStorage)
      clearInterval(heartbeatInterval)
      clearInterval(cleanupInterval)
      if (channel) {
        channel.close()
      }
      // Cleanup leader if we're closing
      if (localStorage.getItem(leaderKey) === myTabId) {
        localStorage.removeItem(leaderKey)
      }
    }
  }, [deviceId, isLeader])

  const broadcast = (msg: Omit<TabMessage, "timestamp">) => {
    const data: TabMessage = { ...msg, timestamp: Date.now() }

    if (channelRef.current) {
      channelRef.current.postMessage(data)
    }

    // localStorage fallback
    try {
      localStorage.setItem(`musicy:tab-msg:${Date.now()}`, JSON.stringify(data))
      setTimeout(() => {
        localStorage.removeItem(`musicy:tab-msg:${data.timestamp}`)
      }, 1000)
    } catch {
      // ignore
    }
  }

  return {
    tabId: tabId.current,
    isLeader,
    otherTabs,
  }
}
