'use client'

import { useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useState, useRef } from 'react'
import { usePlaylist, useDeletePlaylist, useUpdatePlaylist, useRemoveFromPlaylist } from '@/hooks/usePlaylist'
import { useMusicPlayer } from '@/contexts/music-player-context'
import { TrackListItem } from '@/components/track-list-item'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Play, Pause, Edit, Trash2, MoreHorizontal, Share, Heart, Clock, Users, ChevronLeft, Music } from 'lucide-react'
import { formatDuration, cn } from '@/lib/utils'
import { ShareMenu } from '@/components/share-menu'

export default function PlaylistPage() {
  const params = useParams()
  const { data: session } = useSession()
  const playlistId = params.id as string
  
  const { data: playlist, isLoading, error } = usePlaylist(playlistId)
  const { playTrack, isCurrentTrack, isPlaying, currentTrack } = useMusicPlayer()
  
  const deletePlaylistMutation = useDeletePlaylist()
  const updatePlaylistMutation = useUpdatePlaylist()
  const removeTrackMutation = useRemoveFromPlaylist()
  
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isUploadingCover, setIsUploadingCover] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    isPublic: false,
  })

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

  if (error || !playlist) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Playlist Not Found</h2>
            <p className="text-muted-foreground mb-4">
              This playlist doesn't exist or you don't have permission to view it.
            </p>
            <Button onClick={() => window.history.back()}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isOwner = session?.user.id === playlist.owner.id
  const totalDuration = playlist.tracks?.reduce((acc, track) => acc + track.track.duration, 0) || 0

  const handlePlayAll = () => {
    if (playlist.tracks && playlist.tracks.length > 0) {
      const trackList = playlist.tracks.map(pt => pt.track)
      playTrack(trackList[0], trackList, { 
        type: 'playlist', 
        id: playlist.id, 
        name: playlist.name 
      })
    }
  }

  const handleEdit = () => {
    setEditForm({
      name: playlist.name,
      description: playlist.description || '',
      isPublic: playlist.isPublic,
    })
    setIsEditDialogOpen(true)
  }

  const handleUpdate = async () => {
    try {
      await updatePlaylistMutation.mutateAsync({
        id: playlistId,
        data: editForm,
      })
      setIsEditDialogOpen(false)
    } catch (error) {
      console.error('Error updating playlist:', error)
    }
  }

  const handleDelete = async () => {
    try {
      await deletePlaylistMutation.mutateAsync(playlistId)
      window.location.href = '/playlists'
    } catch (error) {
      console.error('Error deleting playlist:', error)
    }
  }

  const handleRemoveTrack = async (trackId: string) => {
    try {
      await removeTrackMutation.mutateAsync({
        playlistId,
        trackId,
      })
    } catch (error) {
      console.error('Error removing track:', error)
    }
  }

  const handleCoverUpload = async (file: File) => {
    if (!isOwner) {
      alert('Only the playlist owner can change the cover image')
      return
    }

    setIsUploadingCover(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'playlists')
      formData.append('entityId', playlistId)

      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const result = await response.json()
        
        // Update playlist with new cover
        const updateResponse = await fetch(`/api/playlists/${playlistId}/cover`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ coverImageUrl: result.url }),
        })

        if (updateResponse.ok) {
          window.location.reload() // Refresh to show new cover
        } else {
          alert('Failed to update playlist cover')
        }
      } else {
        const error = await response.json()
        alert(`Upload failed: ${error.message}`)
      }
    } catch (error) {
      console.error('Cover upload error:', error)
      alert('Failed to upload cover image')
    } finally {
      setIsUploadingCover(false)
    }
  }

  const handleCoverClick = () => {
    if (isOwner && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB')
        return
      }
      
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file')
        return
      }

      handleCoverUpload(file)
    }
  }

  return (
    <div className="flex flex-col -mt-16 pb-20 relative">
      {/* Immersive Playlist Header */}
      <div className="relative h-[45vh] lg:h-[50vh] w-full overflow-hidden">
        <div className="absolute inset-0 bg-neutral-900" />
        {playlist.coverImageUrl ? (
          <div className="absolute inset-0">
             <img 
               src={playlist.coverImageUrl} 
               alt="" 
               className="w-full h-full object-cover blur-2xl opacity-40 scale-110"
             />
             <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-background" />
        )}

        {/* Content Overlay */}
        <div className="absolute inset-x-0 bottom-0 p-6 lg:p-12 flex flex-col items-start lg:flex-row lg:items-end lg:gap-10">
          <div 
             className={cn(
               "w-48 h-48 lg:w-64 lg:h-64 rounded-3xl overflow-hidden shadow-2xl border-4 border-background/20 mb-6 lg:mb-0 relative group",
               isOwner && "cursor-pointer"
             )}
             onClick={handleCoverClick}
          >
            {playlist.coverImageUrl ? (
              <img src={playlist.coverImageUrl} alt={playlist.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted/20">
                <Music className="w-16 h-16 text-primary/40" />
              </div>
            )}
            {isOwner && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                 <Edit className="h-8 w-8 text-white" />
              </div>
            )}
          </div>
          
          <div className="space-y-4 lg:pb-4 flex-1 w-full">
            <div className="space-y-1">
              <Badge variant="secondary" className="bg-primary/20 text-primary border-none font-black text-[10px] py-0 px-2 uppercase tracking-widest">
                Playlist
              </Badge>
              <h1 className="text-4xl lg:text-7xl font-black tracking-tight drop-shadow-2xl truncate">{playlist.name}</h1>
            </div>
            
            <div className="flex items-center gap-4 text-xs font-bold text-foreground/70">
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-primary" />
                {playlist.owner.displayName || playlist.owner.username}
              </span>
              <span>•</span>
              <span>{playlist._count.tracks} tracks</span>
              <span>•</span>
              <span>{formatDuration(totalDuration)}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons for owner (Mobile Overlay) */}
        {isOwner && (
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        )}

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

      {/* Sticky Action Bar */}
      <div className="sticky top-16 z-30 bg-background/80 backdrop-blur-xl border-b border-white/5 lg:static lg:bg-transparent lg:border-none">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4 lg:gap-6">
            <Button
              size="lg"
              onClick={handlePlayAll}
              disabled={!playlist.tracks || playlist.tracks.length === 0}
              className="rounded-full w-14 h-14 lg:w-auto lg:h-14 lg:px-8 group shadow-2xl"
            >
              {currentTrack && playlist.tracks?.some(t => t.track.id === currentTrack.id) && isPlaying ? (
                <Pause className="h-6 w-6 lg:mr-2 fill-current" />
              ) : (
                <Play className="h-6 w-6 lg:mr-2 fill-current" />
              )}
              <span className="hidden lg:inline font-bold italic">Play</span>
            </Button>

            <Button 
              variant="outline" 
              size="icon"
              className="w-12 h-12 lg:w-auto lg:h-12 lg:px-6 rounded-full border-white/10 hover:bg-white/5 transition-all"
            >
              <Heart className="h-5 w-5 lg:mr-2" />
              <span className="hidden lg:inline font-bold">Save</span>
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <ShareMenu 
              title={playlist.name} 
              url={`/playlists/${playlist.id}`} 
              id={playlist.id} 
              type="playlist" 
              trigger={
                <Button variant="ghost" size="icon" className="w-12 h-12 rounded-full">
                  <Share className="h-5 w-5" />
                </Button>
              }
            />
            {isOwner && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-12 h-12 rounded-full">
                    <MoreHorizontal className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-2xl bg-neutral-900 border-white/5 p-2 shadow-2xl">
                  <DropdownMenuItem onClick={handleEdit} className="rounded-xl font-bold py-3">
                    <Edit className="h-4 w-4 mr-3" />
                    Edit Details
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setIsDeleteDialogOpen(true)}
                    className="rounded-xl font-bold py-3 text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-3" />
                    Delete Playlist
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 lg:px-6">
        <div className="space-y-6">
          <h2 className="text-2xl font-black tracking-tight px-1">Tracks</h2>
          <div className="space-y-1">
            {playlist.tracks && playlist.tracks.length > 0 ? (
              playlist.tracks.map((playlistTrack, index) => (
                <div key={playlistTrack.id} className="flex items-center group/item hover:bg-white/5 rounded-2xl transition-colors pr-2">
                  <div className="w-10 text-center text-xs font-bold text-muted-foreground group-hover/item:text-foreground shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <TrackListItem
                      track={playlistTrack.track}
                      isCurrentTrack={isCurrentTrack(playlistTrack.track.id)}
                      isPlaying={isCurrentTrack(playlistTrack.track.id) && isPlaying}
                      onPlay={() => {
                        const trackList = playlist.tracks?.map(pt => pt.track) || []
                        playTrack(playlistTrack.track, trackList, { 
                          type: 'playlist', 
                          id: playlist.id, 
                          name: playlist.name 
                        })
                      }}
                      showAddButton={false}
                      className="bg-transparent hover:bg-transparent border-none py-4"
                    />
                  </div>
                  {isOwner && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveTrack(playlistTrack.track.id)}
                      className="opacity-0 group-hover/item:opacity-100 w-10 h-10 rounded-full hover:bg-destructive/10 hover:text-destructive transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-20 bg-card/10 rounded-3xl border border-dashed border-white/10">
                <Music className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
                <p className="text-xl font-bold">This playlist is empty</p>
                <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
                  {isOwner ? 'Add some cinematic gems to get started!' : 'No tracks have been added yet.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Playlist</DialogTitle>
            <DialogDescription>
              Make changes to your playlist information.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="Playlist name"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="Describe your playlist..."
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="public"
                checked={editForm.isPublic}
                onCheckedChange={(checked) => setEditForm({ ...editForm, isPublic: !!checked })}
              />
              <Label htmlFor="public">Make playlist public</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updatePlaylistMutation.isPending}>
              {updatePlaylistMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Playlist</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{playlist.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deletePlaylistMutation.isPending}
            >
              {deletePlaylistMutation.isPending ? 'Deleting...' : 'Delete Playlist'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
