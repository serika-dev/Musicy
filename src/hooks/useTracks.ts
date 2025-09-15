import { useQuery } from '@tanstack/react-query'

interface Track {
  id: string
  title: string
  duration: number
  format: string
  bitRate?: number
  sampleRate?: number
  genre?: string
  playCount: number
  artist: {
    id: string
    name: string
    verified: boolean
  }
  album?: {
    id: string
    title: string
    coverImageUrl?: string
  }
}

interface TracksResponse {
  tracks: Track[]
  total: number
  limit: number
  offset: number
}

interface UseTracksOptions {
  limit?: number
  offset?: number
  genre?: string
  search?: string
}

export function useTracks(options: UseTracksOptions = {}) {
  const { limit = 50, offset = 0, genre, search } = options

  return useQuery({
    queryKey: ['tracks', { limit, offset, genre, search }],
    queryFn: async (): Promise<TracksResponse> => {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      })
      
      if (genre) params.append('genre', genre)
      if (search) params.append('search', search)
      
      const response = await fetch(`/api/tracks?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch tracks')
      }
      return response.json()
    },
  })
}
