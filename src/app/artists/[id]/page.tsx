'use client'

import { useParams } from 'next/navigation'
import Image from 'next/image'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useArtist, type Artist } from '@/hooks/useArtists'
import { useMusicPlayer } from '@/contexts/music-player-context'
import { TrackListItem } from '@/components/track-list-item'
import { ArtistImage } from '@/components/artist-image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Play, Pause, Heart, Share, Users, Music, ExternalLink } from 'lucide-react'
// import { formatDuration } from '@/lib/utils'

export default function ArtistPage() {
  const params = useParams()
  const artistId = params.id as string
  
  const queryClient = useQueryClient()
  const { data: artist, isLoading, error } = useArtist(artistId)
  const { playTrack, isCurrentTrack, isPlaying, currentTrack } = useMusicPlayer()

  // Optimistic follow/unfollow
  const followMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/artists/${artistId}/follow`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to follow')
      return res.json()
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['artist', artistId] })
      const prev = queryClient.getQueryData(['artist', artistId]) as Artist | undefined
      if (prev) {
        queryClient.setQueryData(['artist', artistId], {
          ...prev,
          _count: { ...prev._count, followers: prev._count.followers + 1 },
          isFollowing: true,
        })
      }
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['artist', artistId], ctx.prev)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['artist', artistId] })
    }
  })

  const unfollowMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/artists/${artistId}/follow`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to unfollow')
      return res.json()
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['artist', artistId] })
      const prev = queryClient.getQueryData(['artist', artistId]) as Artist | undefined
      if (prev) {
        queryClient.setQueryData(['artist', artistId], {
          ...prev,
          _count: { ...prev._count, followers: Math.max(0, prev._count.followers - 1) },
          isFollowing: false,
        })
      }
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['artist', artistId], ctx.prev)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['artist', artistId] })
    }
  })

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="flex items-start space-x-6">
            <div className="w-64 h-64 bg-muted rounded-full"></div>
            <div className="flex-1 space-y-4">
              <div className="h-8 bg-muted rounded w-1/2"></div>
              <div className="h-4 bg-muted rounded w-1/4"></div>
              <div className="h-4 bg-muted rounded w-1/3"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !artist) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Artist Not Found</h2>
            <p className="text-muted-foreground mb-4">
              This artist doesn't exist or is not available.
            </p>
            <Button onClick={() => window.history.back()}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handlePlayAll = () => {
    if (artist.tracks && artist.tracks.length > 0) {
      playTrack(artist.tracks[0], artist.tracks, { 
        type: 'standalone', 
        name: `${artist.name} - Top Tracks` 
      })
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Artist Header */}
      <div className="flex flex-col lg:flex-row items-start space-y-6 lg:space-y-0 lg:space-x-8">
        {/* Artist Image */}
        <div className="w-64 h-64 bg-gradient-to-br from-primary/30 to-primary/60 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
          <ArtistImage
            artistId={artist.id}
            artistImageUrl={artist.imageUrl}
            artistName={artist.name}
            className="w-full h-full object-cover rounded-full"
            fallbackClassName="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-400 to-orange-600 rounded-full"
          />
        </div>

        {/* Artist Info */}
        <div className="flex-1 space-y-4">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <h1 className="text-4xl font-bold">{artist.name}</h1>
              {artist.verified && (
                <Badge variant="secondary" className="text-primary">
                  ✓ Verified
                </Badge>
              )}
            </div>
            {artist.bio && (
              <p className="text-lg text-muted-foreground">{artist.bio}</p>
            )}
          </div>

          <div className="flex items-center space-x-6 text-sm text-muted-foreground">
            <span className="flex items-center space-x-1">
              <Users className="h-4 w-4" />
              <span>{artist._count.followers.toLocaleString()} followers</span>
            </span>
            <span className="flex items-center space-x-1">
              <Music className="h-4 w-4" />
              <span>{artist._count.tracks} tracks</span>
            </span>
            <span>{artist._count.albums} albums</span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-4">
            <Button
              size="lg"
              onClick={handlePlayAll}
              disabled={!artist.tracks || artist.tracks.length === 0}
              className="flex items-center space-x-2"
            >
              {currentTrack && artist.tracks?.some(t => t.id === currentTrack.id) && isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5" />
              )}
              <span>Play</span>
            </Button>

            <Button 
              variant={artist.isFollowing ? 'default' : 'outline'} 
              size="lg"
              onClick={() => (artist.isFollowing ? unfollowMutation.mutate() : followMutation.mutate())}
              disabled={followMutation.isPending || unfollowMutation.isPending}
            >
              <Heart className="h-5 w-5 mr-2" />
              {artist.isFollowing ? 'Following' : 'Follow'}
            </Button>

            <Button variant="outline" size="lg">
              <Share className="h-5 w-5 mr-2" />
              Share
            </Button>

            {artist.website && (
              <Button variant="outline" size="lg" asChild>
                <a href={artist.website} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-5 w-5 mr-2" />
                  Website
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Popular Tracks */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Popular Tracks</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {artist.tracks && artist.tracks.length > 0 ? (
                <div className="space-y-1">
                  {artist.tracks.filter(track => track && track.id && track.title).map((track, index) => (
                    <div key={track.id} className="flex items-center group">
                      <div className="w-8 text-center text-sm text-muted-foreground px-4">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <TrackListItem
                          track={track}
                          isCurrentTrack={isCurrentTrack(track.id)}
                          isPlaying={isCurrentTrack(track.id) && isPlaying}
                          onPlay={() => playTrack(track, artist.tracks, { 
                            type: 'standalone', 
                            name: `${artist.name} - Top Tracks` 
                          })}
                          showAddButton={true}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl opacity-20 mb-4">🎵</div>
                  <p className="text-lg text-muted-foreground">No tracks available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Albums */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Albums</CardTitle>
            </CardHeader>
            <CardContent>
              {artist.albums && artist.albums.length > 0 ? (
                <div className="space-y-4">
                  {artist.albums.map((album) => (
                    <Link key={album.id} href={`/albums/${album.id}`}>
                      <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group">
                        <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/40 rounded-md flex items-center justify-center flex-shrink-0 relative overflow-hidden">
                          {album.coverImageUrl ? (
                            <Image
                              src={album.coverImageUrl}
                              alt={album.title}
                              fill
                              className="object-cover rounded-md"
                              sizes="48px"
                            />
                          ) : (
                            <Music className="h-6 w-6 text-primary/60" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate group-hover:text-primary transition-colors">
                            {album.title}
                          </p>
                          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                            <span className="capitalize">{album.albumType.toLowerCase()}</span>
                            <span>•</span>
                            <span>{album._count.tracks} tracks</span>
                            {album.releaseDate && (
                              <>
                                <span>•</span>
                                <span>{new Date(album.releaseDate).getFullYear()}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl opacity-20 mb-2">💿</div>
                  <p className="text-sm text-muted-foreground">No albums available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
