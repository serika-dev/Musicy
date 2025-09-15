import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// Users management
interface AdminUser {
  id: string
  email: string
  username?: string
  displayName?: string
  avatarUrl?: string
  isPremium: boolean
  role: 'ADMIN' | 'USER'
  createdAt: string
  _count: {
    playlists: number
    likedTracks: number
    tracks?: number
  }
}

interface AdminTrack {
  id: string
  title: string
  duration: number
  filePath: string
  fileSize: string
  bitRate?: number
  sampleRate?: number
  format: string
  trackNumber?: number
  year?: number
  genre?: string
  playCount: number
  isPublic: boolean
  createdAt: string
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
  lrcId?: number
  plainLyrics?: string
  syncedLyrics?: string
}

interface AdminArtist {
  id: string
  name: string
  bio?: string
  imageUrl?: string
  website?: string
  verified: boolean
  createdAt: string
  _count: {
    tracks: number
    albums: number
    followers: number
  }
}

interface AdminAlbum {
  id: string
  title: string
  description?: string
  coverImageUrl?: string
  releaseDate?: string
  genre?: string
  albumType: 'ALBUM' | 'EP' | 'SINGLE' | 'COMPILATION' | 'MIXTAPE'
  isPublic: boolean
  createdAt: string
  artist: {
    id: string
    name: string
    verified: boolean
  }
  _count: {
    tracks: number
  }
}

// Hooks for fetching admin data
export function useAdminUsers(search?: string, limit = 50, offset = 0) {
  return useQuery({
    queryKey: ['admin', 'users', { search, limit, offset }],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      })
      
      if (search) {
        params.append('search', search)
      }
      
      const response = await fetch(`/api/admin/users?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch users')
      }
      return response.json()
    },
  })
}

export function useAdminTracks(search?: string, limit = 50, offset = 0) {
  return useQuery({
    queryKey: ['admin', 'tracks', { search, limit, offset }],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      })
      
      if (search) {
        params.append('search', search)
      }
      
      const response = await fetch(`/api/admin/tracks?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch tracks')
      }
      return response.json()
    },
  })
}

export function useAdminArtists(search?: string, limit = 50, offset = 0) {
  return useQuery({
    queryKey: ['admin', 'artists', { search, limit, offset }],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      })
      
      if (search) {
        params.append('search', search)
      }
      
      const response = await fetch(`/api/admin/artists?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch artists')
      }
      return response.json()
    },
  })
}

export function useAdminAlbums(search?: string, limit = 50, offset = 0) {
  return useQuery({
    queryKey: ['admin', 'albums', { search, limit, offset }],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      })
      
      if (search) {
        params.append('search', search)
      }
      
      const response = await fetch(`/api/admin/albums?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch albums')
      }
      return response.json()
    },
  })
}

// Mutation hooks for CRUD operations
export function useDeleteTrack() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (trackId: string) => {
      const response = await fetch(`/api/admin/tracks/${trackId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to delete track')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'tracks'] })
    },
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to delete user')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
  })
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'ADMIN' | 'USER' }) => {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to update user role')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
  })
}

export function useToggleTrackVisibility() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ trackId, isPublic }: { trackId: string; isPublic: boolean }) => {
      const response = await fetch(`/api/admin/tracks/${trackId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isPublic }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to update track visibility')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'tracks'] })
    },
  })
}

// LRCLib integration
export function useLrcLibSearch() {
  return useMutation({
    mutationFn: async ({ artist, track }: { artist: string; track: string }) => {
      const response = await fetch(`/api/admin/lyrics/search?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(track)}`)
      
      if (!response.ok) {
        throw new Error('Failed to search lyrics')
      }
      
      return response.json()
    },
  })
}

export function useUpdateTrackLyrics() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ trackId, lrcId, plainLyrics, syncedLyrics }: { 
      trackId: string
      lrcId?: number
      plainLyrics?: string
      syncedLyrics?: string
    }) => {
      const response = await fetch(`/api/admin/tracks/${trackId}/lyrics`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lrcId, plainLyrics, syncedLyrics }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to update track lyrics')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'tracks'] })
    },
  })
}

export type { AdminUser, AdminTrack, AdminArtist, AdminAlbum }
