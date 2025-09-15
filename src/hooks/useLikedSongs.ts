import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Track } from '@/types/track'

interface LikedSongsResponse {
  tracks: Track[]
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

export function useLikedSongs(limit = 20, offset = 0) {
  return useQuery({
    queryKey: ['liked-songs', limit, offset],
    queryFn: async (): Promise<LikedSongsResponse> => {
      const response = await fetch(`/api/user/liked-songs?limit=${limit}&offset=${offset}`)
      if (!response.ok) {
        throw new Error('Failed to fetch liked songs')
      }
      return response.json()
    },
  })
}

export function useLikeTrack() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (trackId: string): Promise<{ message: string }> => {
      const response = await fetch('/api/user/liked-songs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ trackId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to like track')
      }

      return response.json()
    },
    onSuccess: () => {
      // Invalidate liked songs queries
      queryClient.invalidateQueries({ queryKey: ['liked-songs'] })
      // Also invalidate profile data since it includes liked tracks count
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
  })
}

export function useUnlikeTrack() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (trackId: string): Promise<{ message: string }> => {
      const response = await fetch(`/api/user/liked-songs?trackId=${trackId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to unlike track')
      }

      return response.json()
    },
    onSuccess: () => {
      // Invalidate liked songs queries
      queryClient.invalidateQueries({ queryKey: ['liked-songs'] })
      // Also invalidate profile data since it includes liked tracks count
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
  })
}

export function useIsTrackLiked(trackId: string) {
  return useQuery({
    queryKey: ['track-liked', trackId],
    queryFn: async (): Promise<boolean> => {
      try {
        const response = await fetch(`/api/user/liked-songs?limit=1000`)
        if (!response.ok) return false
        
        const data: LikedSongsResponse = await response.json()
        return data.tracks.some(track => track.id === trackId)
      } catch {
        return false
      }
    },
  })
}
