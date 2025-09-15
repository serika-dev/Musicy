import { useMutation, useQueryClient } from '@tanstack/react-query'

interface UpdatePlaylistCoverData {
  playlistId: string
  coverImageUrl: string
}

export function useUpdatePlaylistCover() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ playlistId, coverImageUrl }: UpdatePlaylistCoverData) => {
      const response = await fetch(`/api/playlists/${playlistId}/cover`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ coverImageUrl }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to update playlist cover')
      }

      return response.json()
    },
    onSuccess: (_, { playlistId }) => {
      // Invalidate playlist queries
      queryClient.invalidateQueries({ queryKey: ['playlist', playlistId] })
      queryClient.invalidateQueries({ queryKey: ['playlists'] })
    },
  })
}
