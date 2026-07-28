"use client"

import { useCallback, useEffect, useRef, useState } from "react"

export type SaveStatus = "idle" | "saving" | "saved" | "error"

/** How long the confirmed state stays on screen before settling back to idle. */
const CONFIRM_MS = 1800

/**
 * Drives the lifecycle of a save control: idle → saving → saved → idle.
 *
 * The confirmed state lingers just long enough to read, then clears itself. If
 * the caller's save throws, the state goes to "error" and stays there until the
 * next attempt, so the failure isn't silently swallowed by a timeout.
 */
export function useSaveState() {
  const [status, setStatus] = useState<SaveStatus>("idle")
  const [error, setError] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setStatus("idle")
    setError(null)
  }, [])

  const run = useCallback(async (save: () => Promise<unknown> | unknown) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setStatus("saving")
    setError(null)
    try {
      await save()
      if (!mountedRef.current) return true
      setStatus("saved")
      timerRef.current = setTimeout(() => {
        if (mountedRef.current) setStatus("idle")
      }, CONFIRM_MS)
      return true
    } catch (e) {
      if (!mountedRef.current) return false
      setStatus("error")
      setError(e instanceof Error ? e.message : "Something went wrong")
      return false
    }
  }, [])

  return {
    status,
    error,
    run,
    reset,
    isSaving: status === "saving",
    isSaved: status === "saved",
  }
}
