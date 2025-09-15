import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export function useIsArtistFollowed(artistId: string) {
  return useQuery({
    queryKey: ['artist-follow', artistId],
    queryFn: async (): Promise<boolean> => {
      try {
        const response = await fetch(`/api/artists/${artistId}/follow`)
        if (!response.ok) return false
        
        const data = await response.json()
        return data.isFollowing
      } catch {
        return false
      }
    },
    enabled: !!artistId,
  })
}

export function useFollowArtist() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (artistId: string): Promise<{ message: string }> => {
      const response = await fetch(`/api/artists/${artistId}/follow`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to follow artist')
      }

      return response.json()
    },
    onSuccess: (_, artistId) => {
      // Invalidate follow status
      queryClient.invalidateQueries({ queryKey: ['artist-follow', artistId] })
      // Invalidate profile data since it includes following count
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      // Invalidate artists lists
      queryClient.invalidateQueries({ queryKey: ['artists'] })
    },
  })
}

export function useUnfollowArtist() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (artistId: string): Promise<{ message: string }> => {
      const response = await fetch(`/api/artists/${artistId}/follow`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to unfollow artist')
      }

      return response.json()
    },
    onSuccess: (_, artistId) => {
      // Invalidate follow status
      queryClient.invalidateQueries({ queryKey: ['artist-follow', artistId] })
      // Invalidate profile data since it includes following count
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      // Invalidate artists lists
      queryClient.invalidateQueries({ queryKey: ['artists'] })
    },
  })
}
