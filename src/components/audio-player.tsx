"use client"

import { useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Play, Pause, Volume2, VolumeX, Maximize2, SkipBack, SkipForward, Repeat, Shuffle } from "lucide-react"
import { formatDuration } from "@/lib/utils"
import { BigPlayer } from "./big-player"
import { useMusicPlayer } from "@/contexts/music-player-context"
import { Slider } from "@/components/ui/slider"
import { ScrobbleStatus } from "@/components/scrobble-status"

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
    repeatMode
  } = useMusicPlayer()
  const [isBigPlayerOpen, setIsBigPlayerOpen] = useState(false)

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
      {/* Player UI */}
    <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border shadow-2xl z-50">
      <div className="container mx-auto px-2 sm:px-4">
        {/* Progress Bar - Full Width */}
        <div className="py-1 sm:py-2">
          <Slider
            value={[progressPercentage]}
            onValueChange={handleSeek}
            max={100}
            step={0.1}
            className="cursor-pointer"
          />
        </div>
        
        <div className="pb-2 sm:pb-4">
          <div className="flex items-center justify-between">
            {/* Track Info */}
            <div className="flex items-center space-x-2 sm:space-x-4 flex-1 min-w-0 max-w-[40%] sm:max-w-sm">
              <div className="w-10 h-10 sm:w-14 sm:h-14 bg-muted rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden relative">
                {currentTrack.album?.coverImageUrl ? (
                  <Image
                    src={currentTrack.album.coverImageUrl} 
                    alt={currentTrack.album?.title || 'Album cover'}
                    fill
                    className="object-cover rounded-lg"
                    sizes="(max-width: 640px) 40px, 56px"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/30 to-primary/50 rounded-lg flex items-center justify-center">
                    <div className="text-lg sm:text-2xl">🎵</div>
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold truncate text-sm sm:text-lg">{currentTrack.title}</p>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                  {currentTrack.artist.name}
                  {currentTrack.artist.verified && " ✓"}
                </p>
                <div className="hidden sm:block">
                  <ScrobbleStatus className="mt-0.5" />
                </div>
              </div>
            </div>

            {/* Main Controls - Center */}
            <div className="flex items-center space-x-1 sm:space-x-2">
              {/* Shuffle - Hidden on small screens */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleShuffle}
                className={`hidden sm:flex h-6 w-6 sm:h-8 sm:w-8 ${isShuffle ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Shuffle className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>

              {/* Previous */}
              <Button
                variant="ghost"
                size="icon"
                onClick={previousTrack}
                className="h-6 w-6 sm:h-8 sm:w-8"
              >
                <SkipBack className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>

              {/* Play/Pause - Larger */}
              <Button
                size="icon"
                onClick={togglePlayPause}
                className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4 sm:h-5 sm:w-5" />
                ) : (
                  <Play className="h-4 w-4 sm:h-5 sm:w-5 ml-0.5" />
                )}
              </Button>

              {/* Next */}
              <Button
                variant="ghost"
                size="icon"
                onClick={nextTrack}
                className="h-6 w-6 sm:h-8 sm:w-8"
              >
                <SkipForward className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>

              {/* Repeat - Hidden on small screens */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleRepeat}
                className={`hidden sm:flex h-6 w-6 sm:h-8 sm:w-8 relative ${isRepeat ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                title={repeatMode === 'track' ? 'Repeat Track' : repeatMode === 'playlist' ? 'Repeat Playlist' : 'Repeat Off'}
              >
                <Repeat className="h-3 w-3 sm:h-4 sm:w-4" />
                {repeatMode === 'track' && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-primary rounded-full" />
                )}
              </Button>
            </div>

            {/* Right Controls */}
            <div className="flex items-center space-x-1 sm:space-x-2 lg:space-x-4 flex-1 justify-end max-w-[40%] sm:max-w-sm">
              {/* Time Display */}
              <div className="hidden md:flex items-center space-x-1 lg:space-x-2 text-xs lg:text-sm text-muted-foreground min-w-0">
                <span className="tabular-nums">{formatDuration(Math.floor(currentTime))}</span>
                <span>/</span>
                <span className="tabular-nums">{formatDuration(Math.floor(duration))}</span>
              </div>

              {/* Volume Control */}
              <div className="hidden lg:flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleMute}
                  className="h-6 w-6 lg:h-8 lg:w-8"
                >
                  {isMuted ? (
                    <VolumeX className="h-3 w-3 lg:h-4 lg:w-4" />
                  ) : (
                    <Volume2 className="h-3 w-3 lg:h-4 lg:w-4" />
                  )}
                </Button>
                <div className="w-16 lg:w-20">
                  <Slider
                    value={[isMuted ? 0 : volume * 100]}
                    onValueChange={handleVolumeChange}
                    max={100}
                    step={1}
                    className="cursor-pointer"
                  />
                </div>
              </div>

              {/* Big Player Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsBigPlayerOpen(true)}
                className="h-6 w-6 sm:h-8 sm:w-8"
              >
                <Maximize2 className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </div>
            </div>
          </div>
        </div>
      </div>

      {/* Big Player Modal */}
      <BigPlayer 
        isOpen={isBigPlayerOpen} 
        onClose={() => setIsBigPlayerOpen(false)} 
      />
    </>
  )
}