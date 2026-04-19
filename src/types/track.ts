// Shared Track interface for consistent typing across the app

export interface Track {
  id: string
  title: string
  duration: number
  coverImageUrl?: string
  filePath: string
  format: string
  bitRate?: number
  sampleRate?: number
  genre?: string
  artist: {
    id: string
    name: string
    verified?: boolean
    imageUrl?: string
  }
  featuredArtists?: {
    id: string
    name: string
    imageUrl?: string
  }[]
  album?: {
    id: string
    title: string
    coverImageUrl?: string
    albumType?: string
    featuredArtists?: {
      id: string
      name: string
      imageUrl?: string
    }[]
  }
}

export interface TrackWithPlayCount extends Track {
  playCount: number
}

export interface PlaylistTrack {
  id: string
  position: number
  addedAt: string
  track: Track
}
