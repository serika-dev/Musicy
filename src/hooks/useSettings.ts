"use client"

import { useCallback } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import {
  DEFAULT_SETTINGS,
  mergeSettings,
  type UserSettings,
} from "@/lib/settings-defaults"

export { DEFAULT_SETTINGS }
export type { UserSettings }

async function fetchSettings(): Promise<UserSettings> {
  const res = await fetch("/api/user/settings")
  if (!res.ok) throw new Error("Failed to load settings")
  const data = await res.json()
  return mergeSettings(data)
}

async function saveSettings(patch: Partial<UserSettings>): Promise<UserSettings> {
  const res = await fetch("/api/user/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  })
  if (!res.ok) throw new Error("Failed to save settings")
  const data = await res.json()
  return mergeSettings(data)
}

export function useSettings() {
  const { status } = useSession()
  const queryClient = useQueryClient()
  const enabled = status === "authenticated"

  const query = useQuery({
    queryKey: ["user", "settings"],
    queryFn: fetchSettings,
    enabled,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  })

  const mutation = useMutation({
    mutationFn: saveSettings,
    // Optimistic update for instant UI response
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: ["user", "settings"] })
      const prev = queryClient.getQueryData<UserSettings>(["user", "settings"])
      const next: UserSettings = mergeSettings({ ...(prev ?? DEFAULT_SETTINGS), ...patch })
      queryClient.setQueryData(["user", "settings"], next)
      return { prev }
    },
    onError: (_err, _patch, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["user", "settings"], ctx.prev)
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["user", "settings"], data)
    },
  })

  const settings = query.data ?? DEFAULT_SETTINGS

  const updateSettings = useCallback(
    (patch: Partial<UserSettings>) => {
      mutation.mutate(patch)
    },
    [mutation]
  )

  /** Awaitable variant, for callers that report save progress in the UI. */
  const updateSettingsAsync = useCallback(
    (patch: Partial<UserSettings>) => mutation.mutateAsync(patch),
    [mutation]
  )

  const resetSettings = useCallback(() => {
    mutation.mutate(DEFAULT_SETTINGS)
  }, [mutation])

  return {
    settings,
    updateSettings,
    updateSettingsAsync,
    resetSettings,
    isSaving: mutation.isPending,
    hydrated: query.isSuccess || !enabled,
    isLoading: query.isLoading,
  }
}
