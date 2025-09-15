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
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Play, Pause, Edit, Trash2, MoreHorizontal, Share, Heart, Clock, Users } from 'lucide-react'
import { formatDuration } from '@/lib/utils'

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
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Playlist Header */}
      <div className="flex flex-col lg:flex-row items-start space-y-6 lg:space-y-0 lg:space-x-8">
        {/* Cover Art */}
        <div className="relative">
          <div 
            className={`w-64 h-64 bg-gradient-to-br from-primary/30 to-primary/60 rounded-lg flex items-center justify-center flex-shrink-0 ${
              isOwner ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''
            } ${isUploadingCover ? 'opacity-50' : ''}`}
            onClick={handleCoverClick}
          >
            {playlist.coverImageUrl ? (
              <img
                src={playlist.coverImageUrl}
                alt={playlist.name}
                className="w-full h-full object-cover rounded-lg"
              />
            ) : (
              <div className="text-6xl opacity-50">🎵</div>
            )}
            
            {/* Upload overlay for owners */}
            {isOwner && (
              <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center opacity-0 hover:opacity-100">
                <div className="text-white text-center">
                  <div className="text-2xl mb-2">📷</div>
                  <p className="text-sm font-medium">
                    {isUploadingCover ? 'Uploading...' : 'Change Cover'}
                  </p>
                </div>
              </div>
            )}
          </div>
          
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Playlist Info */}
        <div className="flex-1 space-y-4">
          <div>
            <h1 className="text-4xl font-bold">{playlist.name}</h1>
            {playlist.description && (
              <p className="text-lg text-muted-foreground mt-2">{playlist.description}</p>
            )}
          </div>

          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <span className="flex items-center space-x-1">
              <Users className="h-4 w-4" />
              <span>{playlist.owner.displayName || playlist.owner.username}</span>
            </span>
            <span>•</span>
            <span>{playlist._count.tracks} tracks</span>
            <span>•</span>
            <span className="flex items-center space-x-1">
              <Clock className="h-4 w-4" />
              <span>{formatDuration(totalDuration)}</span>
            </span>
            {playlist.isPublic && (
              <>
                <span>•</span>
                <span>Public</span>
              </>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-4">
            <Button
              size="lg"
              onClick={handlePlayAll}
              disabled={!playlist.tracks || playlist.tracks.length === 0}
              className="flex items-center space-x-2"
            >
              {currentTrack && playlist.tracks?.some(t => t.track.id === currentTrack.id) && isPlaying ? (
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

            {isOwner && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="lg">
                    <MoreHorizontal className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={handleEdit}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Playlist
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setIsDeleteDialogOpen(true)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Playlist
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>

      {/* Tracks List */}
      <Card>
        <CardHeader>
          <CardTitle>Tracks</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {playlist.tracks && playlist.tracks.length > 0 ? (
            <div className="space-y-1">
              {playlist.tracks.map((playlistTrack, index) => (
                <div key={playlistTrack.id} className="flex items-center group">
                  <div className="w-8 text-center text-sm text-muted-foreground px-4">
                    {index + 1}
                  </div>
                  <div className="flex-1">
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
                    />
                  </div>
                  {isOwner && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveTrack(playlistTrack.track.id)}
                      className="opacity-0 group-hover:opacity-100 mr-4"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl opacity-20 mb-4">🎵</div>
              <p className="text-lg text-muted-foreground">This playlist is empty</p>
              <p className="text-sm text-muted-foreground mt-2">
                {isOwner ? 'Start adding some tracks!' : 'No tracks have been added yet.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

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
