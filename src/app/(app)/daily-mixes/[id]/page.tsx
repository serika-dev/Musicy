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
    filePath: string
    format: string
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
    <div className="flex flex-col pb-20 relative space-y-6">
      {/* Immersive Mix Header */}
      <div className="relative h-[40vh] lg:h-[45vh] w-full overflow-hidden rounded-3xl shadow-xl border border-white/5">
        <div className="absolute inset-0 bg-neutral-900" />
        {dailyMix.coverImageUrl ? (
          <div className="absolute inset-0">
             <Image 
               src={dailyMix.coverImageUrl} 
               alt="" 
               fill
               className="w-full h-full object-cover blur-2xl opacity-40 scale-110"
             />
             <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-background" />
        )}

        {/* Content Overlay */}
        <div className="absolute inset-x-0 bottom-0 p-6 lg:p-12 flex flex-col items-start lg:flex-row lg:items-end lg:gap-10">
          <div className="w-48 h-48 lg:w-64 lg:h-64 rounded-3xl overflow-hidden shadow-2xl border-4 border-background/20 mb-6 lg:mb-0 relative group">
            {dailyMix.coverImageUrl ? (
              <Image src={dailyMix.coverImageUrl} alt={dailyMix.name} fill className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted/20">
                <div className="text-6xl text-primary/40">🎵</div>
              </div>
            )}
          </div>
          
          <div className="space-y-4 lg:pb-4 flex-1 w-full">
            <div className="space-y-1">
              <Badge variant="secondary" className="bg-primary/20 text-primary border-none font-black text-[10px] py-0 px-2 uppercase tracking-widest">
                Daily Mix
              </Badge>
              <h1 className="text-4xl lg:text-7xl font-black tracking-tight drop-shadow-2xl truncate">{dailyMix.name}</h1>
            </div>
            
            <div className="flex items-center gap-4 text-xs font-bold text-foreground/70">
              <span className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-primary" />
                {dailyMix.user?.displayName || dailyMix.user?.username || 'Musicy'}
              </span>
              <span>•</span>
              <span>{dailyMix.tracks?.length || 0} tracks</span>
              <span>•</span>
              <span>{formatDuration(totalDuration)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Action Bar */}
      <div className="sticky top-16 z-30 bg-background/80 backdrop-blur-xl border-b border-white/5 lg:static lg:bg-transparent lg:border-none">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4 lg:gap-6">
            <Button
              size="lg"
              onClick={handlePlayAll}
              disabled={!dailyMix.tracks || dailyMix.tracks.length === 0}
              className="rounded-full w-14 h-14 lg:w-auto lg:h-14 lg:px-8 group shadow-2xl"
            >
              {currentTrack && dailyMix.tracks?.some(t => t.id === currentTrack.id) && isPlaying ? (
                <Pause className="h-6 w-6 lg:mr-2 fill-current" />
              ) : (
                <Play className="h-6 w-6 lg:mr-2 fill-current" />
              )}
              <span className="hidden lg:inline font-bold italic">Play</span>
            </Button>
            <Button variant="outline" size="icon" className="w-12 h-12 lg:w-auto lg:h-12 lg:px-6 rounded-full border-white/10 hover:bg-white/5 transition-all">
              <Heart className="h-5 w-5 lg:mr-2" />
              <span className="hidden lg:inline font-bold">Like</span>
            </Button>
            {dailyMix.canSave && (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="icon" onClick={handleDialogOpen} className="w-12 h-12 lg:w-auto lg:h-12 lg:px-6 rounded-full border-white/10 hover:bg-white/5 transition-all">
                    <Save className="h-5 w-5 lg:mr-2" />
                    <span className="hidden lg:inline font-bold">Save</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md rounded-[2rem] border-white/10 shadow-2xl p-6">
                   <DialogHeader>
                      <DialogTitle className="text-2xl font-black mb-2">Save Mix to Library</DialogTitle>
                   </DialogHeader>
                   <div className="space-y-4">
                      <div>
                        <label className="text-xs font-black uppercase text-foreground/40 tracking-widest block mb-2">Playlist Name</label>
                        <Input value={playlistName} onChange={(e) => setPlaylistName(e.target.value)} className="h-12 rounded-xl font-medium bg-white/5 border-white/10 focus-visible:ring-primary/50" />
                      </div>
                      <div>
                        <label className="text-xs font-black uppercase text-foreground/40 tracking-widest block mb-2">Description</label>
                        <Textarea value={playlistDescription} onChange={(e) => setPlaylistDescription(e.target.value)} className="rounded-xl font-medium bg-white/5 border-white/10 focus-visible:ring-primary/50 resize-none" rows={3} />
                      </div>
                      <Button size="lg" className="w-full rounded-xl font-bold font-lg h-12" onClick={handleSavePlaylist} disabled={savePlaylistMutation.isPending || !playlistName.trim()}>
                        {savePlaylistMutation.isPending ? 'Saving...' : 'Save Playlist'}
                      </Button>
                   </div>
                </DialogContent>
              </Dialog>
            )}
            <Button variant="outline" size="icon" className="w-12 h-12 rounded-full lg:hidden border-white/10 flex-shrink-0">
               <Share className="h-5 w-5" />
            </Button>
            
            {expiresAt && (
              <div className="hidden lg:flex items-center text-sm font-bold text-amber-500 bg-amber-500/10 px-4 py-2 rounded-full ml-auto">
                <Clock className="w-4 h-4 mr-2" />
                Expires {expiresAt.toLocaleDateString()}
              </div>
            )}
          </div>
          
          <Button variant="ghost" size="icon" className="w-12 h-12 rounded-full hidden lg:flex border-white/10 hover:bg-white/5">
             <Share className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 lg:px-6">
        <div className="space-y-6">
          <h2 className="text-2xl font-black tracking-tight px-1">Tracks</h2>
          <div className="space-y-1">
            {dailyMix.tracks && dailyMix.tracks.length > 0 ? (
              dailyMix.tracks.map((track, index) => (
                <div key={track.id} className="flex items-center group/item hover:bg-white/5 rounded-2xl transition-colors pr-2">
                  <div className="w-10 text-center text-xs font-bold text-muted-foreground group-hover/item:text-foreground shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <TrackListItem
                      track={track as any}
                      isCurrentTrack={isCurrentTrack(track.id)}
                      isPlaying={isCurrentTrack(track.id) && isPlaying}
                      onPlay={() => playTrack(track as any, dailyMix.tracks as any, {
                        type: 'daily-mix',
                        id: dailyMix.id,
                        name: dailyMix.name
                      })}
                      showAddButton={true}
                      className="bg-transparent hover:bg-transparent border-none py-4"
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-20 bg-card/10 rounded-3xl border border-dashed border-white/10">
                <div className="text-6xl mx-auto mb-4 opacity-20">🎵</div>
                <p className="text-xl font-bold">This mix is empty</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
