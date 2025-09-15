"use client"

import Link from "next/link"
import Image from "next/image"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Music, Play, Heart } from "lucide-react"
import { usePlaylists } from "@/hooks/usePlaylist"

export function FeaturedPlaylists() {
  const { data: playlistsData, isLoading } = usePlaylists(false, 4, 0)

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={`playlist-loading-${i}`} className="animate-pulse">
            <CardHeader className="p-4">
              <div className="aspect-square bg-muted rounded-md mb-4"></div>
              <div className="h-4 bg-muted rounded"></div>
              <div className="h-3 bg-muted rounded w-3/4"></div>
            </CardHeader>
          </Card>
        ))}
      </div>
    )
  }

  const playlists = playlistsData?.playlists || []

  if (playlists.length === 0) {
    return (
      <div className="text-center py-12">
        <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No featured playlists available yet.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {playlists.map((playlist) => (
        <Card key={playlist.id} className="group cursor-pointer hover:shadow-lg transition-shadow" asChild>
          <Link href={`/playlists/${playlist.id}`}>
            <CardHeader className="p-4">
              <div className="aspect-square bg-muted rounded-md mb-4 flex items-center justify-center group-hover:bg-muted/80 transition-colors relative overflow-hidden">
                {playlist.coverImageUrl ? (
                  <Image
                    src={playlist.coverImageUrl}
                    alt={playlist.name}
                    fill
                    className="object-cover rounded-md"
                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
                  />
                ) : (
                  <Music className="h-12 w-12 text-muted-foreground" />
                )}
              </div>
              <CardTitle className="text-lg">{playlist.name}</CardTitle>
              <CardDescription>
                {playlist.description || `By ${playlist.owner.displayName || playlist.owner.username}`}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {playlist._count.tracks} tracks
                </span>
                <div className="flex space-x-2">
                  <Button size="sm" variant="ghost" onClick={(e) => e.stopPropagation()}>
                    <Play className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={(e) => e.stopPropagation()}>
                    <Heart className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Link>
        </Card>
      ))}
    </div>
  )
}
