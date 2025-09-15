import { useQuery } from '@tanstack/react-query'

interface ArtistImageData {
  imageUrl?: string
  fallbackUrl?: string
  source: 'profile' | 'album' | 'none'
}

export function useArtistImage(artistId?: string, artistImageUrl?: string) {
  return useQuery({
    queryKey: ['artistImage', artistId],
    queryFn: async (): Promise<ArtistImageData> => {
      // If artist already has a profile picture, use it
      if (artistImageUrl) {
        return {
          imageUrl: artistImageUrl,
          source: 'profile'
        }
      }

      if (!artistId) {
        return { source: 'none' }
      }

      // Fetch artist's recent album covers as fallback
      const response = await fetch(`/api/artists/${artistId}/recent-cover`)
      if (response.ok) {
        const data = await response.json()
        return {
          fallbackUrl: data.coverImageUrl,
          source: 'album'
        }
      }

      return { source: 'none' }
    },
    enabled: !!artistId,
    staleTime: 1000 * 60 * 15, // 15 minutes
    cacheTime: 1000 * 60 * 60, // 1 hour
  })
}

