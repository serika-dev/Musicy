import { useQuery } from '@tanstack/react-query'

interface Stats {
  tracks: number
  playlists: number
  artists: number
  albums: number
}

interface Track {
  id: string
  title: string
  duration: number
  format: string
  genre?: string
  artist: {
    name: string
    verified: boolean
  }
  album?: {
    title: string
    coverImageUrl?: string
  }
}

interface StatsResponse {
  stats: Stats
  recentTracks: Track[]
}

export function useStats() {
  return useQuery({
    queryKey: ['stats'],
    queryFn: async (): Promise<StatsResponse> => {
      const response = await fetch('/api/stats')
      if (!response.ok) {
        throw new Error('Failed to fetch stats')
      }
      return response.json()
    },
  })
}
