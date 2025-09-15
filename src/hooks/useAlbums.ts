import { useQuery } from '@tanstack/react-query'
import { Track } from '@/types/track'

export interface Album {
  id: string
  title: string
  description?: string
  coverImageUrl?: string
  releaseDate?: string
  genre?: string
  albumType: 'ALBUM' | 'EP' | 'SINGLE'
  isPublic: boolean
  createdAt: string
  updatedAt: string
  artist: {
    id: string
    name: string
    verified: boolean
    imageUrl?: string
  }
  tracks?: Track[]
  _count?: {
    tracks: number
  }
}

export interface AlbumsResponse {
  albums: Album[]
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

export interface DetailedTrack extends Track {
  trackNumber?: number
  playCount: number
  artist: {
    id: string
    name: string
    verified: boolean
    imageUrl?: string
  }
  album?: {
    id: string
    title: string
    coverImageUrl?: string
    releaseDate?: string
    genre?: string
    albumType: 'ALBUM' | 'EP' | 'SINGLE'
  }
}

// Hook to fetch multiple albums
export function useAlbums(search?: string, limit = 20, offset = 0) {
  return useQuery<AlbumsResponse>({
    queryKey: ['albums', { search, limit, offset }],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      })
      
      if (search) {
        params.append('search', search)
      }
      
      const response = await fetch(`/api/albums?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch albums')
      }
      return response.json()
    },
  })
}

// Hook to fetch a specific album
export function useAlbum(id: string) {
  return useQuery<Album>({
    queryKey: ['album', id],
    queryFn: async () => {
      const response = await fetch(`/api/albums/${id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch album')
      }
      return response.json()
    },
    enabled: !!id,
  })
}

// Hook to fetch a specific track
export function useTrack(id: string) {
  return useQuery<DetailedTrack>({
    queryKey: ['track', id],
    queryFn: async () => {
      const response = await fetch(`/api/tracks/${id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch track')
      }
      return response.json()
    },
    enabled: !!id,
  })
}
