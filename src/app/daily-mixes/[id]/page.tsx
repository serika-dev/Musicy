'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useMusicPlayer } from '@/contexts/music-player-context'
import { TrackListItem } from '@/components/track-list-item'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Play, Pause, Heart, Share, Clock, Calendar, User, Save } from 'lucide-react'
import { formatDuration } from '@/lib/utils'

interface DailyMix {
  id: string
  name: string
  description: string
  coverImageUrl?: string
  mixType: string
  createdDate: string
  expiresAt?: string
  canSave?: boolean
  user?: {
    id: string
    displayName?: string
    username?: string
  }
  tracks: Array<{
    id: string
    title: string
    duration: number
    artist: {
      id: string
      name: string
      verified: boolean
    }
    album: {
      id: string
      title: string
      coverImageUrl?: string
    }
    [key: string]: unknown
  }>
}

export default function DailyMixPage() {
  const params = useParams()
  const mixId = params.id as string
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [playlistName, setPlaylistName] = useState('')
  const [playlistDescription, setPlaylistDescription] = useState('')
  
  const { playTrack, isCurrentTrack, isPlaying, currentTrack } = useMusicPlayer()

  const { data: dailyMix, isLoading, error } = useQuery<DailyMix>({
    queryKey: ['dailyMix', mixId],
    queryFn: async () => {
      const response = await fetch(`/api/daily-mixes/${mixId}`)
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Daily mix not found')
        }
        if (response.status === 410) {
          throw new Error('Daily mix has expired')
        }
        throw new Error('Failed to fetch daily mix')
      }
      return response.json()
    },
  })

  const savePlaylistMutation = useMutation({
    mutationFn: async ({ name, description }: { name: string; description: string }) => {
      const response = await fetch(`/api/daily-mixes/${mixId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playlistName: name,
          description: description,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to save playlist')
      }

      return response.json()
    },
    onSuccess: (data) => {
      console.log('Playlist saved successfully:', data)
      setIsDialogOpen(false)
      setPlaylistName('')
      setPlaylistDescription('')
      // You might want to show a success toast here
      alert(`Successfully saved as playlist: ${data.playlist.name}`)
    },
    onError: (error) => {
      console.error('Error saving playlist:', error)
      alert(`Failed to save playlist: ${error.message}`)
    },
  })

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="flex items-start space-x-6">
            <div className="w-64 h-64 bg-muted rounded"></div>
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

  if (error || !dailyMix) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">
              {error?.message === 'Daily mix has expired' ? 'Mix Expired' : 'Daily Mix Not Found'}
            </h2>
            <p className="text-muted-foreground mb-4">
              {error?.message === 'Daily mix has expired' 
                ? 'This daily mix has expired. Check out today\'s fresh mixes!'
                : 'This daily mix doesn\'t exist or is not available.'
              }
            </p>
            <Button onClick={() => window.history.back()}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handlePlayAll = () => {
    if (dailyMix.tracks && dailyMix.tracks.length > 0) {
      playTrack(dailyMix.tracks[0])
    }
  }

  const handleSavePlaylist = () => {
    if (!playlistName.trim()) {
      alert('Please enter a playlist name')
      return
    }

    savePlaylistMutation.mutate({
      name: playlistName.trim(),
      description: playlistDescription.trim(),
    })
  }

  // Set default playlist name when dialog opens
  const handleDialogOpen = () => {
    if (!playlistName) {
      setPlaylistName(`${dailyMix?.name} - ${new Date().toLocaleDateString()}`)
      setPlaylistDescription(`Saved from ${dailyMix?.name}`)
    }
    setIsDialogOpen(true)
  }

  const totalDuration = dailyMix.tracks?.reduce((acc, track) => acc + (track.duration || 0), 0) || 0
  const expiresAt = dailyMix.expiresAt ? new Date(dailyMix.expiresAt) : null
  const createdAt = new Date(dailyMix.createdDate)

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Daily Mix Header */}
        <div className="flex flex-col lg:flex-row items-start gap-8">
          {/* Mix Cover */}
          <div className="w-full sm:w-80 sm:mx-auto lg:mx-0 lg:w-80 lg:flex-shrink-0">
            <div className="aspect-square w-full bg-gradient-to-br from-primary/20 via-primary/30 to-primary/40 rounded-2xl overflow-hidden shadow-2xl relative group">
              {dailyMix.coverImageUrl ? (
                <Image
                  src={dailyMix.coverImageUrl}
                  alt={dailyMix.name}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 320px, 320px"
                  priority
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-8xl opacity-40">🎵</div>
                </div>
              )}
              {/* Gradient overlay for better text readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
            </div>
          </div>

          {/* Mix Info */}
          <div className="flex-1 space-y-6 lg:py-4">
            <div className="space-y-3">
              <Badge variant="secondary" className="text-xs font-medium px-3 py-1">
                Daily Mix
              </Badge>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">
                {dailyMix.name}
              </h1>
              {dailyMix.description && (
                <p className="text-lg text-muted-foreground leading-relaxed">
                  {dailyMix.description}
                </p>
              )}
            </div>

            {/* Stats */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              {dailyMix.user && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>
                    {dailyMix.user.displayName || dailyMix.user.username || 'Musicy'}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>{createdAt.toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>{formatDuration(totalDuration)}</span>
              </div>
              <span className="font-medium">{dailyMix.tracks?.length || 0} tracks</span>
            </div>

            {expiresAt && (
              <div className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
                <Clock className="h-4 w-4 inline mr-2" />
                Expires {expiresAt.toLocaleString()}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <Button
                size="lg"
                onClick={handlePlayAll}
                disabled={!dailyMix.tracks || dailyMix.tracks.length === 0}
                className="flex items-center gap-2 px-6 py-3 text-base font-semibold"
              >
                {currentTrack && dailyMix.tracks?.some(t => t.id === currentTrack.id) && isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5" />
                )}
                <span>Play All</span>
              </Button>

              <Button variant="outline" size="lg" className="flex items-center gap-2">
                <Heart className="h-5 w-5" />
                <span className="hidden sm:inline">Like</span>
              </Button>

              {dailyMix.canSave && (
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="lg" onClick={handleDialogOpen} className="flex items-center gap-2">
                      <Save className="h-5 w-5" />
                      <span className="hidden sm:inline">Save as Playlist</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Save as Playlist</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="playlist-name" className="block text-sm font-medium mb-2">
                          Playlist Name
                        </label>
                        <Input
                          id="playlist-name"
                          value={playlistName}
                          onChange={(e) => setPlaylistName(e.target.value)}
                          placeholder="Enter playlist name"
                        />
                      </div>
                      <div>
                        <label htmlFor="playlist-description" className="block text-sm font-medium mb-2">
                          Description (optional)
                        </label>
                        <Textarea
                          id="playlist-description"
                          value={playlistDescription}
                          onChange={(e) => setPlaylistDescription(e.target.value)}
                          placeholder="Enter playlist description"
                          rows={3}
                        />
                      </div>
                      <div className="flex justify-end space-x-3">
                        <Button 
                          variant="outline" 
                          onClick={() => setIsDialogOpen(false)}
                          disabled={savePlaylistMutation.isPending}
                        >
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleSavePlaylist}
                          disabled={savePlaylistMutation.isPending || !playlistName.trim()}
                        >
                          {savePlaylistMutation.isPending ? 'Saving...' : 'Save Playlist'}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}

              <Button variant="outline" size="lg" className="flex items-center gap-2">
                <Share className="h-5 w-5" />
                <span className="hidden sm:inline">Share</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Tracks */}
        <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl font-bold flex items-center gap-3">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <Play className="h-4 w-4 text-primary" />
              </div>
              Tracks
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {dailyMix.tracks && dailyMix.tracks.length > 0 ? (
              <div className="space-y-0">
                {dailyMix.tracks.map((track, index) => (
                  <div 
                    key={track.id} 
                    className="flex items-center group hover:bg-muted/30 transition-colors"
                  >
                    <div className="w-12 text-center text-sm text-muted-foreground font-medium px-4 py-1">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <TrackListItem
                        track={track}
                        isCurrentTrack={isCurrentTrack(track.id)}
                        isPlaying={isCurrentTrack(track.id) && isPlaying}
                        onPlay={() => playTrack(track, dailyMix.tracks, {
                          type: 'daily-mix',
                          name: dailyMix.name
                        })}
                        showAddButton={true}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="text-8xl opacity-20 mb-4">🎵</div>
                <h3 className="text-xl font-semibold mb-2">No tracks in this mix</h3>
                <p className="text-muted-foreground">This mix appears to be empty.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
