"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Play, Pause, Volume2, VolumeX, Maximize2, SkipBack, SkipForward, Repeat, Shuffle, Music2, Monitor, Speaker, Laptop, Smartphone, Heart } from "lucide-react"
import { formatDuration } from "@/lib/utils"
import { BigPlayer } from "./big-player"
import { useMusicPlayer } from "@/contexts/music-player-context"
import { Slider } from "@/components/ui/slider"
import { ScrobbleStatus } from "@/components/scrobble-status"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useIsTrackLiked, useLikeTrack, useUnlikeTrack } from "@/hooks/useLikedSongs"
import { DownloadButton } from "./download-button"

export function AudioPlayer() {
  const { 
    currentTrack, 
    isPlaying, 
    togglePlayPause, 
    currentTime,
    duration,
    volume,
    isMuted,
    setVolume,
    toggleMute,
    seekTo,
    nextTrack,
    previousTrack,
    toggleRepeat,
    toggleShuffle,
    isRepeat,
    isShuffle,
    repeatMode,
    // Device sync
    deviceId,
    deviceName,
    activeDeviceId,
    isActiveDevice,
    devices,
    claimPlayback,
    transferPlayback,
    isLeader,
    tabCount,
  } = useMusicPlayer()
  const [isBigPlayerOpen, setIsBigPlayerOpen] = useState(false)
  const [devicesOpen, setDevicesOpen] = useState(false)

  const { data: isLiked } = useIsTrackLiked(currentTrack?.id || "")
  const { mutate: likeTrack } = useLikeTrack()
  const { mutate: unlikeTrack } = useUnlikeTrack()

  const [localLike, setLocalLike] = useState<boolean>(false)
  useEffect(() => {
    if (isLiked !== undefined) setLocalLike(isLiked)
  }, [isLiked])

  const handleLikeToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!currentTrack) return
    const newState = !localLike
    setLocalLike(newState) // Optimistic transition
    if (newState) {
      likeTrack(currentTrack.id)
    } else {
      unlikeTrack(currentTrack.id)
    }
  }

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0] / 100)
  }

  const handleSeek = (value: number[]) => {
    if (duration > 0) {
      const seekTime = (value[0] / 100) * duration
      seekTo(seekTime)
    }
  }

  if (!currentTrack) return null

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <>
      <div className="fixed bottom-0 md:bottom-6 left-0 md:left-6 md:right-6 right-0 z-50 bg-background/85 dark:bg-background/70 backdrop-blur-2xl border-t md:border border-border/50 md:rounded-2xl shadow-2xl transition-all duration-300">
        {/* Progress bar - thin line at top */}
        <div className="h-1 md:h-1.5 w-full bg-muted md:rounded-t-2xl overflow-hidden relative cursor-pointer group" onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          const pct = ((e.clientX - rect.left) / rect.width) * 100
          handleSeek([pct])
        }}>
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${progressPercentage}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `${progressPercentage}%`, transform: `translateX(-50%) translateY(-50%)` }}
          />
        </div>

        <div className="h-16 px-4 flex items-center gap-4">
          {/* Track Info */}
          <div className="flex items-center gap-3 flex-1 min-w-0 max-w-xs">
            <div
              className="w-10 h-10 rounded bg-muted flex-shrink-0 overflow-hidden relative cursor-pointer"
              onClick={() => setIsBigPlayerOpen(true)}
            >
              {(() => {
                const imgUrl = currentTrack.coverImageUrl || currentTrack.album?.coverImageUrl
                if (imgUrl) return (
                  <Image
                    src={imgUrl}
                    alt={currentTrack.album?.title || currentTrack.title}
                    fill
                    className="object-cover"
                    sizes="40px"
                  />
                )
                return (
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
                    <Music2 className="w-4 h-4 text-muted-foreground" />
                  </div>
                )
              })()}
            </div>
            <div className="min-w-0 pr-2 pb-1 md:pb-0">
              <p className="text-sm font-medium truncate">{currentTrack.title}</p>
              <p className="text-xs text-muted-foreground truncate">{currentTrack.artist.name}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLikeToggle}
              className={`h-8 w-8 ml-auto mr-1 hidden sm:flex transition-colors ${localLike ? 'text-red-500 hover:text-red-400' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Heart className={`h-4 w-4 transition-transform ${localLike ? 'fill-current scale-110' : 'scale-100'}`} />
            </Button>
          </div>

          {/* Center Controls */}
          <div className="flex items-center justify-center gap-2 md:gap-4 flex-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleShuffle}
              className={`hidden sm:flex h-8 w-8 ${isShuffle ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Shuffle className="h-3.5 w-3.5" />
            </Button>

            <Button variant="ghost" size="icon" onClick={previousTrack} className="h-8 w-8">
              <SkipBack className="h-4 w-4" />
            </Button>

            <Button
              size="icon"
              onClick={togglePlayPause}
              className="h-9 w-9 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
            </Button>

            <Button variant="ghost" size="icon" onClick={nextTrack} className="h-8 w-8">
              <SkipForward className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleRepeat}
              className={`hidden sm:flex h-8 w-8 relative ${isRepeat ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Repeat className="h-3.5 w-3.5" />
              {repeatMode === 'track' && (
                <div className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 bg-primary rounded-full" />
              )}
            </Button>
          </div>

          {/* Right */}
          <div className="flex items-center gap-2 flex-1 justify-end max-w-xs">
            {/* Device button - like Spotify Connect */}
            <Popover open={devicesOpen} onOpenChange={setDevicesOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={`h-8 w-8 ${!isActiveDevice ? 'text-primary' : ''}`}
                >
                  {isActiveDevice ? (
                    <Speaker className="h-4 w-4" />
                  ) : (
                    <Monitor className="h-4 w-4" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent 
                className="w-80 p-0" 
                align="end" 
                side="top"
                sideOffset={12}
              >
                <div className="p-4">
                  <h3 className="font-semibold text-sm mb-3">Connect to a device</h3>
                  
                  {/* Current device status */}
                  <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">
                      {isActiveDevice ? "Currently playing on" : "Controlling playback on"}
                    </div>
                    <div className="font-medium text-sm flex items-center gap-2">
                      <Speaker className="h-4 w-4 text-primary" />
                      {deviceName}
                      {tabCount > 1 && (
                        <span className="text-xs text-muted-foreground">
                          ({tabCount} tabs)
                        </span>
                      )}
                    </div>
                    {!isLeader && isActiveDevice && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Audio playing in another tab
                      </div>
                    )}
                  </div>

                  {/* Device list */}
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {devices.map((d) => {
                      const isThis = d.id === deviceId
                      const isActive = d.id === activeDeviceId || d.isActive
                      return (
                        <button
                          key={d.id}
                          onClick={() => {
                            if (isThis && !isActive) {
                              claimPlayback()
                            } else if (!isThis && !isActive) {
                              transferPlayback(d.id)
                            }
                            setDevicesOpen(false)
                          }}
                          className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left ${
                            isActive 
                              ? 'bg-primary/10 text-primary' 
                              : 'hover:bg-muted cursor-pointer'
                          }`}
                        >
                          <div className="p-1.5 rounded bg-muted">
                            {isActive ? <Speaker className="h-4 w-4" /> : <Laptop className="h-4 w-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">
                              {d.name}
                              {isThis && <span className="ml-1.5 text-xs text-muted-foreground">(This device)</span>}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {isActive ? "Now playing" : "Available"}
                            </div>
                          </div>
                          {isActive && <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
                        </button>
                      )
                    })}
                  </div>

                  {devices.length === 0 && (
                    <div className="text-center text-sm text-muted-foreground py-4">
                      No other devices found
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            <span className="hidden md:inline text-[11px] text-muted-foreground tabular-nums">
              {formatDuration(Math.floor(currentTime))} / {formatDuration(Math.floor(duration))}
            </span>

            <div className="hidden lg:flex items-center gap-1.5">
              <Button variant="ghost" size="icon" onClick={toggleMute} className="h-7 w-7">
                {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
              </Button>
              <div className="w-20">
                <Slider
                  value={[isMuted ? 0 : volume * 100]}
                  onValueChange={handleVolumeChange}
                  max={100}
                  step={1}
                  className="cursor-pointer"
                />
              </div>
            </div>

            <DownloadButton track={currentTrack} className="h-8 w-8 text-muted-foreground hover:text-foreground" />
            <Button variant="ghost" size="icon" onClick={() => setIsBigPlayerOpen(true)} className="h-8 w-8">
              <Maximize2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      <BigPlayer
        isOpen={isBigPlayerOpen}
        onClose={() => setIsBigPlayerOpen(false)}
      />
    </>
  )
}