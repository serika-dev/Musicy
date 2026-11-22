"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTabSync } from "./useTabSync";

const DEVICE_ID_KEY = "musicy:device-id";

function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id =
      "dev_" +
      Math.random().toString(36).slice(2, 10) +
      Math.random().toString(36).slice(2, 10);
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

function getDeviceName(): string {
  if (typeof window === "undefined") return "Unknown";
  const ua = navigator.userAgent;
  let browser = "Browser";
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/Chrome\//i.test(ua)) browser = "Chrome";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";
  else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser = "Safari";

  let os = "Unknown OS";
  if (/Windows/i.test(ua)) os = "Windows";
  else if (/Mac OS X/i.test(ua)) os = "macOS";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";
  else if (/Linux/i.test(ua)) os = "Linux";
  return `${browser} on ${os}`;
}

export interface RemoteDevice {
  id: string;
  name: string;
  isActive: boolean;
  lastSeenAt: string;
}

export type SyncEventHandler = (event: {
  type: string;
  fromDeviceId?: string;
  payload?: unknown;
}) => void;

export interface SyncPublishEvent {
  type: string;
  fromDeviceId?: string;
  targetDeviceId?: string;
  payload?: unknown;
}

/**
 * Low-level SSE connection. Returns helpers for publishing and a list of
 * currently-registered devices.
 */
export function useDeviceSync(onEvent?: SyncEventHandler) {
  const { status } = useSession();
  const [deviceId] = useState<string>(() => getOrCreateDeviceId());
  const deviceName = useRef<string>("");
  const [devices, setDevices] = useState<RemoteDevice[]>([]);
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  // Cross-tab leader election for same-device multi-tab support
  const { tabId, isLeader, otherTabs, claimLeadership } = useTabSync(deviceId);

  useEffect(() => {
    if (typeof window !== "undefined") {
      deviceName.current = getDeviceName();
    }
  }, []);

  useEffect(() => {
    if (status !== "authenticated" || !deviceId) return;

    let disposed = false;
    let attempt = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let watchdog: ReturnType<typeof setTimeout> | null = null;

    const clearTimers = () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (watchdog) clearTimeout(watchdog);
      reconnectTimer = null;
      watchdog = null;
    };

    /**
     * The server pings every 20s. If nothing arrives for well over that, the
     * connection is a zombie — a suspended laptop or a proxy that dropped the
     * stream without an error — so tear it down and dial again.
     */
    const armWatchdog = () => {
      if (watchdog) clearTimeout(watchdog);
      watchdog = setTimeout(() => {
        if (!disposed) connect(true);
      }, 50_000);
    };

    const scheduleReconnect = () => {
      if (disposed || reconnectTimer) return;
      // Exponential backoff with jitter, capped at 15s.
      const delay = Math.min(1000 * 2 ** attempt, 15_000);
      const jitter = delay * 0.25 * Math.random();
      attempt += 1;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, delay + jitter);
    };

    function connect(force = false) {
      if (disposed) return;
      if (eventSourceRef.current) {
        if (!force && eventSourceRef.current.readyState !== EventSource.CLOSED)
          return;
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      clearTimers();

      const url = `/api/sync/stream?deviceId=${encodeURIComponent(deviceId)}&name=${encodeURIComponent(deviceName.current)}`;
      const es = new EventSource(url);
      eventSourceRef.current = es;

      // Any traffic at all — including the keep-alive — proves we're live.
      const touch = () => {
        if (disposed) return;
        attempt = 0;
        setConnected(true);
        armWatchdog();
      };

      es.onopen = touch;
      es.addEventListener("ready", touch);
      es.addEventListener("device-list", (e: MessageEvent) => {
        touch();
        try {
          setDevices(JSON.parse(e.data).payload.devices);
        } catch {
          // A malformed frame shouldn't drop the connection.
        }
      });

      const forward = (e: MessageEvent) => {
        touch();
        try {
          onEventRef.current?.(JSON.parse(e.data));
        } catch {
          // ignore
        }
      };
      es.addEventListener("state", forward);
      es.addEventListener("command", forward);
      es.addEventListener("claim", forward);
      es.addEventListener("disconnect", forward);
      // Autoplay-protection events were published by the context but never
      // listened for here, so `remoteBlockedDevices` never populated.
      es.addEventListener("autoplay-blocked", forward);
      es.addEventListener("autoplay-resolved", forward);

      es.onerror = () => {
        if (disposed) return;
        setConnected(false);
        es.close();
        eventSourceRef.current = null;
        scheduleReconnect();
      };
    }

    connect();

    // Coming back from a background tab or a dead network should reconnect
    // immediately rather than waiting out the backoff.
    const revive = () => {
      if (disposed || document.visibilityState !== "visible") return;
      if (
        !eventSourceRef.current ||
        eventSourceRef.current.readyState === EventSource.CLOSED
      ) {
        attempt = 0;
        clearTimers();
        connect();
      }
    };
    document.addEventListener("visibilitychange", revive);
    window.addEventListener("online", revive);

    return () => {
      disposed = true;
      clearTimers();
      document.removeEventListener("visibilitychange", revive);
      window.removeEventListener("online", revive);
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
      setConnected(false);
    };
  }, [status, deviceId]);

  // State frames are sent one at a time: while one is in flight, a newer
  // frame replaces any queued one. Overlapping POSTs could land out of order
  // (flipping controllers back to the previous track) and pile up.
  const stateInFlightRef = useRef(false);
  const pendingStateRef = useRef<{
    event: SyncPublishEvent;
    resolvers: Array<(ok: boolean) => void>;
  } | null>(null);

  const publish = useCallback(
    async (event: SyncPublishEvent): Promise<boolean> => {
      // Only the leader tab sends state to server (prevents duplicate HTTP requests)
      // Non-leader tabs still process events locally but don't send to server
      // All tabs receive state via SSE (server distributes to all connections)
      if (!isLeader && event.type === "state") return false;

      const post = (body: string, keepalive: boolean) =>
        fetch("/api/sync/publish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive,
        }).catch(() => null);

      if (event.type === "state") {
        return new Promise<boolean>((resolve) => {
          if (stateInFlightRef.current) {
            const replaced = pendingStateRef.current;
            pendingStateRef.current = {
              event,
              resolvers: [...(replaced?.resolvers ?? []), resolve],
            };
            return;
          }

          const run = async (
            next: SyncPublishEvent,
            resolvers: Array<(ok: boolean) => void>,
          ) => {
            stateInFlightRef.current = true;
            // Never keepalive: browsers cap in-flight keepalive bodies at 64KB
            // total and reject the rest, and state frames carry a queue window.
            const response = await post(
              JSON.stringify({ fromDeviceId: deviceId, ...next }),
              false,
            );
            const ok = !!response?.ok;
            for (const r of resolvers) r(ok);

            const queued = pendingStateRef.current;
            pendingStateRef.current = null;
            if (queued) {
              void run(queued.event, queued.resolvers);
            } else {
              stateInFlightRef.current = false;
            }
          };
          void run(event, [resolve]);
        });
      }

      const body = JSON.stringify({ fromDeviceId: deviceId, ...event });
      // keepalive lets a command sent as the tab closes still land, but only
      // fits small bodies (a playTrack command can carry a large queue).
      const keepalive = new TextEncoder().encode(body).length < 60_000;

      let response = await post(body, keepalive);

      // Commands are one-shot instructions — a lost "pause" leaves the other
      // device playing, so those get one retry.
      if (!response || !response.ok) {
        await new Promise((r) => setTimeout(r, 400));
        response = await post(body, keepalive);
      }

      if (response && !response.ok) {
        console.warn("sync publish returned non-ok status:", response.status);
      }
      return !!response?.ok;
    },
    [deviceId, isLeader],
  );

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
    claimLeadership,
    tabCount: otherTabs.length + 1,
  };
}
