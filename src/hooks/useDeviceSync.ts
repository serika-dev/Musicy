"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useSession } from "next-auth/react"
import { useTabSync } from "./useTabSync"

const DEVICE_ID_KEY = "musicy:device-id"

function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return ""
  let id = localStorage.getItem(DEVICE_ID_KEY)
  if (!id) {
    id =
      "dev_" +
      Math.random().toString(36).slice(2, 10) +
      Math.random().toString(36).slice(2, 10)
    localStorage.setItem(DEVICE_ID_KEY, id)
  }
  return id
}

function getDeviceName(): string {
  if (typeof window === "undefined") return "Unknown"
  const ua = navigator.userAgent
  let browser = "Browser"
  if (/Edg\//i.test(ua)) browser = "Edge"
  else if (/Chrome\//i.test(ua)) browser = "Chrome"
  else if (/Firefox\//i.test(ua)) browser = "Firefox"
  else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser = "Safari"

  let os = "Unknown OS"
  if (/Windows/i.test(ua)) os = "Windows"
  else if (/Mac OS X/i.test(ua)) os = "macOS"
  else if (/Android/i.test(ua)) os = "Android"
  else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS"
  else if (/Linux/i.test(ua)) os = "Linux"
  return `${browser} on ${os}`
}

export interface RemoteDevice {
  id: string
  name: string
  isActive: boolean
  lastSeenAt: string
}

export type SyncEventHandler = (event: {
  type: string
  fromDeviceId?: string
  payload?: unknown
}) => void

/**
 * Low-level SSE connection. Returns helpers for publishing and a list of
 * currently-registered devices.
 */
export function useDeviceSync(onEvent?: SyncEventHandler) {
  const { status } = useSession()
  const [deviceId] = useState<string>(() => getOrCreateDeviceId())
  const deviceName = useRef<string>("")
  const [devices, setDevices] = useState<RemoteDevice[]>([])
  const [connected, setConnected] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  // Cross-tab leader election for same-device multi-tab support
  const { tabId, isLeader, otherTabs } = useTabSync(deviceId)

  useEffect(() => {
    if (typeof window !== "undefined") {
      deviceName.current = getDeviceName()
    }
  }, [])

  useEffect(() => {
    if (status !== "authenticated" || !deviceId) return

    const url = `/api/sync/stream?deviceId=${encodeURIComponent(deviceId)}&name=${encodeURIComponent(deviceName.current)}`
    const es = new EventSource(url)
    eventSourceRef.current = es

    es.addEventListener("ready", () => setConnected(true))
    es.addEventListener("device-list", (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data)
        setDevices(data.payload.devices)
      } catch {
        // ignore
      }
    })

    const forward = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data)
        onEventRef.current?.(data)
      } catch {
        // ignore
      }
    }
    es.addEventListener("state", forward)
    es.addEventListener("command", forward)
    es.addEventListener("claim", forward)
    es.addEventListener("disconnect", forward)

    es.onerror = () => {
      setConnected(false)
    }

    return () => {
      es.close()
      eventSourceRef.current = null
      setConnected(false)
    }
  }, [status, deviceId])

  const publish = useCallback(
    async (event: { type: string; fromDeviceId?: string; targetDeviceId?: string; payload?: unknown }) => {
      // Only the leader tab sends state to server (prevents duplicate HTTP requests)
      // Non-leader tabs still process events locally but don't send to server
      // All tabs receive state via SSE (server distributes to all connections)
      if (!isLeader && event.type === "state") return

      try {
        const response = await fetch("/api/sync/publish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fromDeviceId: deviceId,
            ...event,
          }),
          keepalive: true,
        }).catch(() => null) // Silently catch network errors/aborts
        
        if (response && !response.ok) {
          console.warn("sync publish returned non-ok status:", response.status)
        }
      } catch (err) {
        // Silently catch errors to avoid UI crashes on network instability
      }
    },
    [deviceId, isLeader]
  )

  return {
    deviceId,
    deviceName: deviceName.current,
    devices,
    connected,
    publish,
    // Tab sync info
    tabId,
    isLeader,
    otherTabs,
    tabCount: otherTabs.length + 1,
  }
}
