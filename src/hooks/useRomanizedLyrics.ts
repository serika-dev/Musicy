"use client"

import { useQuery } from "@tanstack/react-query"

export type RomanizeLanguage = "auto" | "ja" | "ko" | "hi"
export type RomanizeMode = "plain" | "synced"

interface RomanizeResponse {
  romanized: string
  language: string | null
  cached?: boolean
}

async function romanizeTrack(
  trackId: string,
  mode: RomanizeMode,
  language: RomanizeLanguage
): Promise<string> {
  const res = await fetch("/api/lyrics/romanize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      trackId,
      mode,
      language: language === "auto" ? undefined : language,
    }),
  })
  if (!res.ok) throw new Error("Failed to romanize track lyrics")
  const data: RomanizeResponse = await res.json()
  return data.romanized
}

/**
 * Fetch romanized lyrics for a track. Uses server-side DB cache so that after
 * the first computation, subsequent loads are instant (just a DB read).
 */
export function useRomanizedLyrics(
  trackId: string | undefined,
  mode: RomanizeMode,
  enabled: boolean,
  language: RomanizeLanguage = "auto"
) {
  return useQuery({
    queryKey: ["romanized-lyrics", trackId, mode, language],
    queryFn: async () => {
      if (!trackId) return null
      return romanizeTrack(trackId, mode, language)
    },
    enabled: enabled && !!trackId,
    staleTime: 1000 * 60 * 60, // 1 hour (romanization is deterministic)
    gcTime: 1000 * 60 * 60 * 4,
    retry: 1,
  })
}
