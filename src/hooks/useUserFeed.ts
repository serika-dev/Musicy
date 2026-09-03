import { useQuery } from "@tanstack/react-query"
import type { Track } from "@/types/track"

interface FeedAlbum {
  id: string
  title: string
  coverImageUrl?: string
  releaseDate?: string
  albumType: "ALBUM" | "EP" | "SINGLE"
  genre?: string
  artist: {
    id: string
    name: string
    verified: boolean
    imageUrl?: string
  }
  _count: {
    tracks: number
  }
}

interface FeedArtist {
  id: string
  name: string
  imageUrl?: string
  verified: boolean
  _count: {
    tracks: number
    albums: number
  }
}

interface FeedResponse {
  followedAlbums: FeedAlbum[]
  newReleases?: FeedAlbum[]
  recommendedTracks: Track[]
  discoverAlbums: FeedAlbum[]
  likedGenres: string[]
  followedArtistCount: number
  recentlyPlayed: Track[]
  topArtists: FeedArtist[]
  recommendedArtists: FeedArtist[]
}

export function useUserFeed() {
  return useQuery<FeedResponse>({
    queryKey: ["user-feed"],
    queryFn: async () => {
      const response = await fetch("/api/user/feed")
      if (!response.ok) {
        throw new Error("Failed to fetch feed")
      }
      return response.json()
    },
  })
}
