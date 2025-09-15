import { useQuery } from '@tanstack/react-query'

export interface LyricsData {
  lrcId?: number
  plainLyrics?: string
  syncedLyrics?: string
}

export interface ParsedLyricLine {
  time: number
  text: string
  id?: string
}

export function useLyrics(trackId?: string) {
  return useQuery({
    queryKey: ['lyrics', trackId],
    queryFn: async (): Promise<LyricsData | null> => {
      if (!trackId) return null
      
      const response = await fetch(`/api/tracks/${trackId}/lyrics`)
      if (!response.ok) {
        if (response.status === 404) {
          return null // No lyrics available
        }
        throw new Error('Failed to fetch lyrics')
      }
      
      return response.json()
    },
    enabled: !!trackId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    cacheTime: 1000 * 60 * 30, // 30 minutes
  })
}

// Parse synced lyrics into timestamped lines
export function parseSyncedLyrics(syncedLyrics?: string): Array<{time: number, text: string}> {
  if (!syncedLyrics) return []
  
  const lines = syncedLyrics.split('\n')
  const parsedLines: Array<{time: number, text: string}> = []
  
  for (const line of lines) {
    const match = line.match(/^\[(\d{2}):(\d{2})\.(\d{2})\]\s*(.*)$/)
    if (match) {
      const minutes = parseInt(match[1], 10)
      const seconds = parseInt(match[2], 10)
      const centiseconds = parseInt(match[3], 10)
      const timeInSeconds = minutes * 60 + seconds + centiseconds / 100
      const text = match[4].trim()
      
      if (text) { // Only add non-empty lines
        parsedLines.push({
          time: timeInSeconds,
          text: text
        })
      }
    }
  }
  
  return parsedLines.sort((a, b) => a.time - b.time)
}

// Get current lyric line based on playback time
export function getCurrentLyricLine(
  parsedLyrics: Array<{time: number, text: string}>,
  currentTime: number
): {current?: {time: number, text: string}, next?: {time: number, text: string}} {
  if (!parsedLyrics.length || currentTime < 0) {
    return {}
  }
  
  let currentIndex = -1
  
  for (let i = 0; i < parsedLyrics.length; i++) {
    if (parsedLyrics[i].time <= currentTime) {
      currentIndex = i
    } else {
      break
    }
  }
  
  return {
    current: currentIndex >= 0 ? parsedLyrics[currentIndex] : undefined,
    next: currentIndex + 1 < parsedLyrics.length ? parsedLyrics[currentIndex + 1] : undefined
  }
}
