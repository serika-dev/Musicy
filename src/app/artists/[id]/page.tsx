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
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Play, Pause, Heart, Share, Users, Music, ExternalLink, ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ShareMenu } from '@/components/share-menu'

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
    <div className="flex flex-col -mt-16 pb-20 relative">
      {/* Immersive Header Background */}
      <div className="relative h-[45vh] lg:h-[50vh] w-full overflow-hidden">
        <div className="absolute inset-0 bg-neutral-900" />
        {artist.imageUrl ? (
          <div className="absolute inset-0">
             <img 
               src={artist.imageUrl} 
               alt="" 
               className="w-full h-full object-cover blur-2xl opacity-40 scale-110"
             />
             <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-background" />
        )}
        
        {/* Content Overlay */}
        <div className="absolute inset-x-0 bottom-0 p-6 lg:p-12 flex flex-col items-start lg:flex-row lg:items-end lg:gap-10">
          <div className="w-48 h-48 lg:w-64 lg:h-64 rounded-full overflow-hidden shadow-2xl border-4 border-background/20 mb-6 lg:mb-0 relative group">
            <ArtistImage
              artistId={artist.id}
              artistImageUrl={artist.imageUrl}
              artistName={artist.name}
              className="w-full h-full object-cover"
              fallbackClassName="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-400 to-orange-600"
            />
          </div>
          
          <div className="space-y-4 lg:pb-4 flex-1">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {artist.verified && (
                  <Badge variant="secondary" className="bg-primary/20 text-primary border-none font-black text-[10px] py-0 px-2 uppercase">
                    Verified
                  </Badge>
                )}
              </div>
              <h1 className="text-5xl lg:text-8xl font-black tracking-tight drop-shadow-xl">{artist.name}</h1>
            </div>
            
            <div className="flex items-center gap-6 text-sm font-bold text-foreground/80">
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-primary" />
                {artist._count.followers.toLocaleString()}
              </span>
              <span className="flex items-center gap-1.5">
                <Music className="h-4 w-4 text-primary" />
                {artist._count.tracks}
              </span>
            </div>
          </div>
        </div>
        
        {/* Back Button (Mobile) */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute top-20 left-4 z-20 rounded-full bg-black/20 backdrop-blur-md border border-white/10 lg:hidden"
          onClick={() => window.history.back()}
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
      </div>

      {/* Action Bar - Sticky on Mobile */}
      <div className="sticky top-16 z-30 bg-background/80 backdrop-blur-xl border-b border-white/5 lg:static lg:bg-transparent lg:border-none">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4 lg:gap-6">
            <Button
              size="lg"
              onClick={handlePlayAll}
              disabled={!artist.tracks || artist.tracks.length === 0}
              className="rounded-full w-14 h-14 lg:w-auto lg:h-14 lg:px-8 group shadow-2xl"
            >
              {currentTrack && artist.tracks?.some(t => t.id === currentTrack.id) && isPlaying ? (
                <Pause className="h-6 w-6 lg:mr-2 fill-current" />
              ) : (
                <Play className="h-6 w-6 lg:mr-2 fill-current" />
              )}
              <span className="hidden lg:inline font-bold">Play</span>
            </Button>

            <Button 
              variant="outline" 
              size="icon"
              className={cn(
                "w-12 h-12 lg:w-auto lg:h-12 lg:px-6 rounded-full border-white/10 transition-all",
                artist.isFollowing ? "bg-primary/10 border-primary/20 text-primary" : "hover:bg-white/5"
              )}
              onClick={() => (artist.isFollowing ? unfollowMutation.mutate() : followMutation.mutate())}
              disabled={followMutation.isPending || unfollowMutation.isPending}
            >
              <Heart className={cn("h-5 w-5 lg:mr-2", artist.isFollowing && "fill-current")} />
              <span className="hidden lg:inline font-bold">{artist.isFollowing ? 'Following' : 'Follow'}</span>
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <ShareMenu 
              title={artist.name} 
              url={`/artists/${artist.id}`} 
              id={artist.id} 
              type="artist" 
              trigger={
                <Button variant="ghost" size="icon" className="w-12 h-12 rounded-full">
                  <Share className="h-5 w-5" />
                </Button>
              }
            />
            {artist.website && (
              <Button variant="ghost" size="icon" className="w-12 h-12 rounded-full lg:hidden" asChild>
                <a href={artist.website} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-5 w-5" />
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 lg:px-6">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-12">
          {/* Popular Tracks */}
          <div className="xl:col-span-2 space-y-6">
            <h2 className="text-2xl font-black tracking-tight px-1">Popular</h2>
            <div className="space-y-1">
              {artist.tracks?.filter(track => track && track.id && track.title).map((track, index) => (
                <div key={track.id} className="flex items-center group/item hover:bg-white/5 rounded-xl transition-colors pr-2">
                  <div className="w-10 text-center text-xs font-bold text-muted-foreground group-hover/item:text-foreground transition-colors shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <TrackListItem
                      track={track}
                      isCurrentTrack={isCurrentTrack(track.id)}
                      isPlaying={isCurrentTrack(track.id) && isPlaying}
                      onPlay={() => playTrack(track, artist.tracks, { 
                        type: 'standalone', 
                        name: `${artist.name} - Top Tracks` 
                      })}
                      showAddButton={true}
                      className="bg-transparent hover:bg-transparent border-none"
                    />
                  </div>
                </div>
              ))}
            </div>
            
            {artist.bio && (
              <div className="mt-12 p-6 lg:p-10 bg-card/20 rounded-3xl border border-white/5 space-y-4">
                <h3 className="text-xl font-bold">About {artist.name}</h3>
                <p className="text-muted-foreground leading-relaxed italic line-clamp-6 hover:line-clamp-none transition-all cursor-pointer">
                  {artist.bio}
                </p>
              </div>
            )}
          </div>

          {/* Albums & Side Content */}
          <div className="space-y-12">
            <section className="space-y-6">
              <h2 className="text-2xl font-black tracking-tight px-1">Albums</h2>
              <div className="grid grid-cols-1 gap-4">
                {artist.albums?.map((album) => (
                  <Link key={album.id} href={`/albums/${album.id}`} className="group">
                    <div className="flex items-center gap-4 p-3 rounded-2xl bg-card/20 border border-white/5 group-hover:bg-card/40 transition-all">
                      <div className="w-16 h-16 lg:w-20 lg:h-20 bg-muted rounded-xl flex-shrink-0 relative overflow-hidden shadow-lg group-hover:scale-105 transition-transform">
                        {album.coverImageUrl ? (
                          <img src={album.coverImageUrl} alt={album.title} className="w-full h-full object-cover" />
                        ) : ( <div className="w-full h-full flex items-center justify-center"> <Music className="h-8 w-8 text-primary/40" /> </div> )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm lg:text-base truncate group-hover:text-primary transition-colors">{album.title}</h4>
                        <p className="text-[11px] lg:text-xs text-muted-foreground/80 font-medium">
                          {album.releaseDate ? new Date(album.releaseDate).getFullYear() : 'N/A'} • {album.albumType}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
