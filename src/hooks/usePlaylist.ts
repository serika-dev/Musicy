import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Track } from '@/types/track'

export interface PlaylistTrack {
  id: string
  position: number
  addedAt: string
  track: Track
}

export interface Playlist {
  id: string
  name: string
  description?: string
  coverImageUrl?: string
  isPublic: boolean
  isCollaborative: boolean
  createdAt: string
  updatedAt: string
  owner: {
    id: string
    username?: string
    displayName?: string
  }
  tracks?: PlaylistTrack[]
  _count: {
    tracks: number
    likes: number
  }
}

export interface PlaylistsResponse {
  playlists: Playlist[]
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

// Hook to fetch playlists
export function usePlaylists(userOnly = false, limit = 10, offset = 0) {
  return useQuery<PlaylistsResponse>({
    queryKey: ['playlists', { userOnly, limit, offset }],
    queryFn: async () => {
      const params = new URLSearchParams({
        userOnly: userOnly.toString(),
        limit: limit.toString(),
        offset: offset.toString(),
      })
      
      const response = await fetch(`/api/playlists?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch playlists')
      }
      return response.json()
    },
  })
}

// Hook to fetch a specific playlist
export function usePlaylist(id: string) {
  return useQuery<Playlist>({
    queryKey: ['playlist', id],
    queryFn: async () => {
      const response = await fetch(`/api/playlists/${id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch playlist')
      }
      return response.json()
    },
    enabled: !!id,
  })
}

// Hook to create a playlist
export function useCreatePlaylist() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: {
      name: string
      description?: string
      isPublic?: boolean
    }) => {
      const response = await fetch('/api/playlists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create playlist')
      }

      return response.json()
    },
    onSuccess: () => {
      // Invalidate playlists cache
      queryClient.invalidateQueries({ queryKey: ['playlists'] })
    },
  })
}

// Hook to update a playlist
export function useUpdatePlaylist() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string
      data: {
        name: string
        description?: string
        isPublic?: boolean
      }
    }) => {
      const response = await fetch(`/api/playlists/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update playlist')
      }

      return response.json()
    },
    onSuccess: (data) => {
      // Update specific playlist cache
      queryClient.setQueryData(['playlist', data.id], data)
      // Invalidate playlists list
      queryClient.invalidateQueries({ queryKey: ['playlists'] })
    },
  })
}

// Hook to delete a playlist
export function useDeletePlaylist() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/playlists/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete playlist')
      }

      return response.json()
    },
    onSuccess: (_, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: ['playlist', id] })
      // Invalidate playlists list
      queryClient.invalidateQueries({ queryKey: ['playlists'] })
    },
  })
}

// Hook to add track to playlist
export function useAddToPlaylist() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({
      playlistId,
      trackId,
      position,
    }: {
      playlistId: string
      trackId: string
      position?: number
    }) => {
      const response = await fetch(`/api/playlists/${playlistId}/tracks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ trackId, position }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to add track to playlist')
      }

      return response.json()
    },
    onSuccess: (_, { playlistId }) => {
      // Invalidate specific playlist cache
      queryClient.invalidateQueries({ queryKey: ['playlist', playlistId] })
      // Invalidate playlists list (for track counts)
      queryClient.invalidateQueries({ queryKey: ['playlists'] })
    },
  })
}

// Hook to remove track from playlist
export function useRemoveFromPlaylist() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({
      playlistId,
      trackId,
    }: {
      playlistId: string
      trackId: string
    }) => {
      const response = await fetch(`/api/playlists/${playlistId}/tracks?trackId=${trackId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to remove track from playlist')
      }

      return response.json()
    },
    onSuccess: (_, { playlistId }) => {
      // Invalidate specific playlist cache
      queryClient.invalidateQueries({ queryKey: ['playlist', playlistId] })
      // Invalidate playlists list (for track counts)
      queryClient.invalidateQueries({ queryKey: ['playlists'] })
    },
  })
}
