"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrackListItem } from "@/components/track-list-item"
import { Play, Heart, Shuffle } from "lucide-react"
import { useLikedSongs } from "@/hooks/useLikedSongs"
import { useMusicPlayer } from "@/contexts/music-player-context"

export default function LikedSongsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { data: likedSongsData, isLoading, error } = useLikedSongs(50, 0)
  const { playTrack, isPlaying, currentTrack, isCurrentTrack } = useMusicPlayer()

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          </div>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-6 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-destructive">Failed to load liked songs</p>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  if (!session) {
    return null
  }

  const tracks = likedSongsData?.tracks || []

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-6 py-8 max-w-6xl">
        {/* Header Section */}
        <div className="flex items-end space-x-6 mb-8">
          {/* Large Heart Icon */}
          <div className="w-60 h-60 bg-gradient-to-br from-purple-600 to-purple-800 rounded-lg flex items-center justify-center shadow-xl">
            <Heart className="w-24 h-24 text-white fill-current" />
          </div>

          {/* Playlist Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-muted-foreground mb-2">PLAYLIST</p>
            <h1 className="text-4xl md:text-6xl font-bold mb-4">Liked Songs</h1>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{session.user?.name || session.user?.email}</span>
              <span>•</span>
              <span>{tracks.length} songs</span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-4 mb-8">
          <Button 
            size="lg" 
            className="rounded-full w-14 h-14 p-0"
            disabled={tracks.length === 0}
            onClick={() => {
              if (tracks.length > 0) {
                playTrack(tracks[0], tracks, { 
                  type: 'standalone', 
                  name: 'Liked Songs' 
                })
              }
            }}
          >
            <Play className="w-6 h-6 ml-1" />
          </Button>

          <Button 
            variant="ghost" 
            size="lg"
            disabled={tracks.length === 0}
          >
            <Shuffle className="w-5 h-5" />
          </Button>
        </div>

        {/* Tracks List */}
        <div className="space-y-1">
          {tracks.length > 0 ? (
            <>
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-4 px-4 py-2 text-sm text-muted-foreground border-b">
                <div className="col-span-1">#</div>
                <div className="col-span-6">TITLE</div>
                <div className="col-span-3 hidden md:block">ALBUM</div>
                <div className="col-span-2 text-right">DURATION</div>
              </div>

              {/* Track Items */}
              {tracks.map((track, index) => (
                <div key={track.id} className="grid grid-cols-12 gap-4 group hover:bg-muted/50 rounded-md p-2">
                  <div className="col-span-1 flex items-center">
                    <span className="text-sm text-muted-foreground group-hover:hidden">
                      {index + 1}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="hidden group-hover:flex w-8 h-8 p-0"
                      onClick={() => playTrack(track, tracks, { 
                        type: 'standalone', 
                        name: 'Liked Songs' 
                      })}
                    >
                      {isCurrentTrack(track) && isPlaying ? (
                        <div className="w-4 h-4 flex items-center justify-center">
                          <div className="flex space-x-0.5">
                            <div className="w-0.5 h-4 bg-primary animate-bounce"></div>
                            <div className="w-0.5 h-4 bg-primary animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-0.5 h-4 bg-primary animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                        </div>
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  
                  <div className="col-span-6">
                    <TrackListItem
                      track={track}
                      isPlaying={isPlaying}
                      isCurrentTrack={isCurrentTrack(track)}
                      onPlay={() => playTrack(track, tracks, { 
                        type: 'standalone', 
                        name: 'Liked Songs' 
                      })}
                      showAlbum={false}
                      showAddButton={true}
                    />
                  </div>

                  <div className="col-span-3 hidden md:flex items-center">
                    <span className="text-sm text-muted-foreground truncate">
                      {track.album?.title || 'Unknown Album'}
                    </span>
                  </div>

                  <div className="col-span-2 flex items-center justify-end">
                    <span className="text-sm text-muted-foreground">
                      {Math.floor(track.duration / 60)}:{String(track.duration % 60).padStart(2, '0')}
                    </span>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Heart className="w-16 h-16 text-muted-foreground mx-auto mb-6" />
                <h3 className="text-xl font-semibold mb-2">No liked songs yet</h3>
                <p className="text-muted-foreground mb-6">
                  Songs you like will appear here. Start exploring and heart your favorites!
                </p>
                <Button asChild>
                  <a href="/artists">Browse Music</a>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
