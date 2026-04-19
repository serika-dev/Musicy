'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useQuery } from '@tanstack/react-query'
import { useMusicPlayer } from '@/contexts/music-player-context'
import { TrackListItem } from '@/components/track-list-item'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Play, Pause, Heart, Share, Clock, Calendar, Music } from 'lucide-react'
import { formatDuration } from '@/lib/utils'

interface Album {
  id: string
  title: string
  description?: string
  coverImageUrl?: string
  releaseDate?: string
  genre?: string
  albumType: 'ALBUM' | 'EP' | 'SINGLE'
  isPublic: boolean
  createdAt: string
  artist: {
    id: string
    name: string
    verified: boolean
  }
  tracks: Array<{
    id: string
    title: string
    duration: number
    filePath: string
    format: string
    trackNumber?: number
    artist: {
      id: string
      name: string
      verified: boolean
    }
    album?: {
      id: string
      title: string
      coverImageUrl?: string
    }
  }>
  _count: {
    tracks: number
  }
}

function useAlbum(id: string) {
  return useQuery<Album>({
    queryKey: ['album', id],
    queryFn: async () => {
      const response = await fetch(`/api/albums/${id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch album')
      }
      return response.json()
    },
    enabled: !!id,
  })
}

export default function AlbumPage() {
  const params = useParams()
  const albumId = params.id as string
  
  const { data: album, isLoading, error } = useAlbum(albumId)
  const { playTrack, isCurrentTrack, isPlaying, currentTrack } = useMusicPlayer()

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="flex items-start space-x-6">
            <div className="w-64 h-64 bg-muted rounded-lg"></div>
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

  if (error || !album) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Album Not Found</h2>
            <p className="text-muted-foreground mb-4">
              This album doesn't exist or is not available.
            </p>
            <Button onClick={() => window.history.back()}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handlePlayAll = () => {
    if (album.tracks && album.tracks.length > 0) {
      playTrack(album.tracks[0], album.tracks, { 
        type: 'album', 
        id: album.id, 
        name: album.title 
      })
    }
  }

  const totalDuration = album.tracks?.reduce((acc, track) => acc + (track.duration || 0), 0) || 0
  const releaseDate = album.releaseDate ? new Date(album.releaseDate) : null

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Album Header */}
      <div className="flex flex-col lg:flex-row items-start space-y-6 lg:space-y-0 lg:space-x-8">
        {/* Album Cover */}
        <div className="w-64 h-64 bg-gradient-to-br from-primary/30 to-primary/60 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden relative">
          {album.coverImageUrl ? (
            <Image
              src={album.coverImageUrl}
              alt={album.title}
              fill
              className="object-cover"
              sizes="256px"
            />
          ) : (
            <Music className="w-24 h-24 text-white/80" />
          )}
        </div>

        {/* Album Info */}
        <div className="flex-1 space-y-4">
          <div>
            <Badge variant="secondary" className="mb-2">
              {album.albumType === 'SINGLE' ? 'Single' : 
               album.albumType === 'EP' ? 'EP' : 'Album'}
            </Badge>
            <h1 className="text-4xl font-bold mb-2">{album.title}</h1>
            {album.description && (
              <p className="text-lg text-muted-foreground">{album.description}</p>
            )}
          </div>

          <div className="flex items-center space-x-2 text-lg">
            <Link 
              href={`/artists/${album.artist.id}`}
              className="text-muted-foreground hover:text-foreground hover:underline"
            >
              {album.artist.name}
              {album.artist.verified && <span className="ml-1 text-primary">✓</span>}
            </Link>
          </div>

          <div className="flex items-center space-x-6 text-sm text-muted-foreground">
            {releaseDate && (
              <span className="flex items-center space-x-1">
                <Calendar className="h-4 w-4" />
                <span>{releaseDate.getFullYear()}</span>
              </span>
            )}
            <span className="flex items-center space-x-1">
              <Clock className="h-4 w-4" />
              <span>{formatDuration(totalDuration)}</span>
            </span>
            <span>{album._count.tracks} tracks</span>
            {album.genre && <span>{album.genre}</span>}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-4">
            <Button
              size="lg"
              onClick={handlePlayAll}
              disabled={!album.tracks || album.tracks.length === 0}
              className="flex items-center space-x-2"
            >
              {currentTrack && album.tracks?.some(t => t.id === currentTrack.id) && isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5" />
              )}
              <span>Play All</span>
            </Button>

            <Button variant="outline" size="lg">
              <Heart className="h-5 w-5 mr-2" />
              Like
            </Button>

            <Button variant="outline" size="lg">
              <Share className="h-5 w-5 mr-2" />
              Share
            </Button>
          </div>
        </div>
      </div>

      {/* Tracks */}
      <Card>
        <CardHeader>
          <CardTitle>Tracks</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {album.tracks && album.tracks.length > 0 ? (
            <div className="space-y-1">
              {album.tracks
                .sort((a, b) => (a.trackNumber || 0) - (b.trackNumber || 0))
                .map((track, index) => (
                <div key={track.id} className="flex items-center group">
                  <div className="w-8 text-center text-sm text-muted-foreground px-4">
                    {track.trackNumber || index + 1}
                  </div>
                  <div className="flex-1">
                    <TrackListItem
                      track={track}
                      isCurrentTrack={isCurrentTrack(track.id)}
                      isPlaying={isCurrentTrack(track.id) && isPlaying}
                      onPlay={() => playTrack(track, album.tracks, { 
                        type: 'album', 
                        id: album.id, 
                        name: album.title 
                      })}
                      showAlbum={false}
                      showAddButton={true}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl opacity-20 mb-4">🎵</div>
              <p className="text-lg text-muted-foreground">No tracks in this album</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Additional Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Album Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Release Date:</span>
                  <span className="ml-2">
                    {releaseDate ? releaseDate.toLocaleDateString() : 'Unknown'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Type:</span>
                  <span className="ml-2">
                    {album.albumType === 'SINGLE' ? 'Single' : 
                     album.albumType === 'EP' ? 'EP' : 'Album'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Tracks:</span>
                  <span className="ml-2">{album._count.tracks}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Duration:</span>
                  <span className="ml-2">{formatDuration(totalDuration)}</span>
                </div>
                {album.genre && (
                  <div>
                    <span className="text-muted-foreground">Genre:</span>
                    <span className="ml-2">{album.genre}</span>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Added:</span>
                  <span className="ml-2">
                    {new Date(album.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Credits</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-sm text-muted-foreground">Artist</div>
                <Link 
                  href={`/artists/${album.artist.id}`}
                  className="font-medium hover:underline"
                >
                  {album.artist.name}
                  {album.artist.verified && <span className="ml-1 text-primary">✓</span>}
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
