"use client"

import { Music } from "lucide-react"
import { Carousel, CarouselSlide } from "@/components/shared/carousel"
import { MediaCard } from "@/components/shared/media-card"
import { usePlaylists } from "@/hooks/usePlaylist"
import { useMusicPlayer } from "@/contexts/music-player-context"

export function FeaturedPlaylists() {
  const { data: playlistsData, isLoading } = usePlaylists(false, 6, 0)
  const { playTrack } = useMusicPlayer()

  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex-none basis-[calc(45%-0.75rem)] sm:basis-[calc(33.333%-0.75rem)] md:basis-[calc(25%-0.75rem)] lg:basis-[calc(20%-0.75rem)] xl:basis-[calc(16.666%-0.75rem)] animate-pulse">
            <div className="aspect-square bg-muted rounded-md mb-2" />
            <div className="h-4 bg-muted rounded mb-1" />
            <div className="h-3 bg-muted rounded w-3/4" />
          </div>
        ))}
      </div>
    )
  }

  const playlists = playlistsData?.playlists || []

  const handlePlayPlaylist = (e: React.MouseEvent, playlistId: string, playlistName: string) => {
    e.preventDefault()
    e.stopPropagation()
    fetch(`/api/playlists/${playlistId}/tracks`)
      .then(r => r.json())
      .then(data => {
        const tracks = data.tracks || []
        if (tracks.length > 0) {
          playTrack(tracks[0], tracks, { type: 'playlist', id: playlistId, name: playlistName })
        }
      })
  }

  if (playlists.length === 0) {
    return (
      <div className="text-center py-12">
        <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No featured playlists available yet.</p>
      </div>
    )
  }

  return (
    <Carousel>
      {playlists.map((playlist) => (
        <CarouselSlide key={playlist.id}>
          <MediaCard
            href={`/playlists/${playlist.id}`}
            title={playlist.name}
            subtitle={playlist.description || `By ${playlist.owner.displayName || playlist.owner.username}`}
            imageUrl={playlist.coverImageUrl}
            badge={`${playlist._count?.tracks || 0} tracks`}
            onPlay={(e) => handlePlayPlaylist(e, playlist.id, playlist.name)}
          />
        </CarouselSlide>
      ))}
    </Carousel>
  )
}
