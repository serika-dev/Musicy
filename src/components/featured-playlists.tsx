"use client"

import Link from "next/link"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Music, Play, Pause } from "lucide-react"
import { usePlaylists } from "@/hooks/usePlaylist"
import { useMusicPlayer } from "@/contexts/music-player-context"

export function FeaturedPlaylists() {
  const { data: playlistsData, isLoading } = usePlaylists(false, 6, 0)
  const { playTrack, currentTrack, isPlaying } = useMusicPlayer()

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="p-0 animate-pulse border-0 bg-transparent shadow-none">
            <CardContent className="p-0">
              <div className="aspect-square bg-muted rounded-md mb-3" />
              <div className="h-4 bg-muted rounded mb-1 mx-1" />
              <div className="h-3 bg-muted rounded w-3/4 mx-1" />
            </CardContent>
          </Card>
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

  const isCurrentPlaylistPlaying = (playlist: any) => {
    // Simple heuristic: check if current track context matches this playlist
    return false // Would need context id tracking
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
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
      {playlists.map((playlist) => (
        <Card 
          key={playlist.id} 
          className="group hover:bg-card/60 transition-all duration-300 overflow-hidden cursor-pointer border-0 bg-transparent p-0 shadow-none"
        >
          <Link href={`/playlists/${playlist.id}`}>
            <CardContent className="p-0 space-y-3">
              {/* Cover Image Container */}
              <div className="relative aspect-square bg-gradient-to-br from-primary/20 via-primary/30 to-primary/40 overflow-hidden rounded-md shadow-md">
                {playlist.coverImageUrl ? (
                  <Image
                    src={playlist.coverImageUrl}
                    alt={playlist.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted via-muted/80 to-muted/60">
                    <Music className="w-10 h-10 text-muted-foreground/40" />
                  </div>
                )}
                
                {/* Play Button Overlay */}
                <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                  <Button
                    size="icon"
                    className="rounded-full w-10 h-10 shadow-lg bg-primary text-primary-foreground"
                    onClick={(e) => handlePlayPlaylist(e, playlist.id, playlist.name)}
                  >
                    <Play className="h-5 w-5 ml-0.5" />
                  </Button>
                </div>
              </div>

              {/* Playlist Info Compact */}
              <div className="px-1">
                <h3 className="font-bold text-sm leading-tight truncate">
                  {playlist.name}
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-1 mt-1 font-medium">
                  {playlist.description || `By ${playlist.owner.displayName || playlist.owner.username}`}
                </p>
                <div className="flex items-center mt-1">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold opacity-70">
                    Playlist • {playlist._count?.tracks || 0} tracks
                  </span>
                </div>
              </div>
            </CardContent>
          </Link>
        </Card>
      ))}
    </div>
  )
}
