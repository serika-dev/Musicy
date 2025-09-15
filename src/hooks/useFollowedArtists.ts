import { useQuery } from '@tanstack/react-query'

interface FollowedArtist {
  id: string
  name: string
  verified: boolean
  imageUrl?: string
  bio?: string
  followedAt: string
  _count: {
    tracks: number
    followers: number
  }
}

interface FollowedArtistsResponse {
  artists: FollowedArtist[]
  total: number
  limit: number
  offset: number
}

export function useFollowedArtists(limit: number = 50, offset: number = 0) {
  return useQuery<FollowedArtistsResponse>({
    queryKey: ['followed-artists', limit, offset],
    queryFn: async () => {
      const response = await fetch(`/api/user/followed-artists?limit=${limit}&offset=${offset}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch followed artists')
      }
      
      return response.json()
    }
  })
}
