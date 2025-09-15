import { useQuery } from '@tanstack/react-query'
import { Track } from '@/types/track'

export interface Artist {
  id: string
  name: string
  bio?: string
  imageUrl?: string
  verified: boolean
  website?: string
  socialLinks?: any
  createdAt: string
  tracks?: Track[]
  albums?: Album[]
  isFollowing?: boolean
  _count: {
    tracks: number
    albums: number
    followers: number
  }
}

export interface Album {
  id: string
  title: string
  coverImageUrl?: string
  releaseDate?: string
  genre?: string
  albumType: 'ALBUM' | 'EP' | 'SINGLE'
  _count: {
    tracks: number
  }
}

export interface ArtistsResponse {
  artists: Artist[]
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

// Hook to fetch artists
export function useArtists(search?: string, limit = 20, offset = 0) {
  return useQuery<ArtistsResponse>({
    queryKey: ['artists', { search, limit, offset }],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      })
      
      if (search) {
        params.append('search', search)
      }
      
      const response = await fetch(`/api/artists?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch artists')
      }
      return response.json()
    },
  })
}

// Hook to fetch a specific artist
export function useArtist(id: string) {
  return useQuery<Artist>({
    queryKey: ['artist', id],
    queryFn: async () => {
      const response = await fetch(`/api/artists/${id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch artist')
      }
      return response.json()
    },
    enabled: !!id,
  })
}
