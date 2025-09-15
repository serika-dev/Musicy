'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useMusicPlayer } from '@/contexts/music-player-context'
import { useLyrics, parseSyncedLyrics, type LyricsData, type ParsedLyricLine } from '@/hooks/useLyrics'
import { extractColorsFromImage, generateGradientFromPalette, genreGradients } from '@/lib/color-extractor'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX, 
  Repeat, 
  Shuffle, 
  Heart, 
  Share,
  Minimize2,
  Mic
} from 'lucide-react'
import { formatDuration } from '@/lib/utils'

interface BigPlayerProps {
  isOpen: boolean
  onClose: () => void
}

export function BigPlayer({ isOpen, onClose }: BigPlayerProps) {
  const { 
    currentTrack, 
    isPlaying, 
    togglePlayPause, 
    currentTime,
    duration,
    volume,
    isMuted,
    seekTo,
    setVolume: setGlobalVolume,
    toggleMute,
    nextTrack,
    previousTrack,
    toggleRepeat,
    toggleShuffle,
    isRepeat,
    isShuffle,
    repeatMode
  } = useMusicPlayer()
  
  const [showLyrics, setShowLyrics] = useState(true) // Show lyrics by default
  const [isLiked, setIsLiked] = useState(false)
  const [dynamicGradient, setDynamicGradient] = useState<string | null>(null)
  const lyricsContainerRef = useRef<HTMLDivElement>(null)
  
  // Fetch lyrics for current track
  const { data: lyricsData } = useLyrics(currentTrack?.id)
  const lyricsTyped = lyricsData as LyricsData | undefined
  const parsedSyncedLyrics: ParsedLyricLine[] = lyricsTyped?.syncedLyrics ? parseSyncedLyrics(lyricsTyped.syncedLyrics) : []
  // Add unique IDs to parsed lyrics to prevent duplicate highlighting
  const lyricsWithIds: (ParsedLyricLine & { id: string })[] = parsedSyncedLyrics.map((line, index) => ({
    ...line,
    id: `${currentTrack?.id}-${index}-${line.time}-${line.text.replace(/\s+/g, '-')}`
  }))
  // Compute current and next lyric indices from lyricsWithIds for accurate tracking
  const currentLyricIndex = (() => {
    let index = -1
    for (let i = 0; i < lyricsWithIds.length; i++) {
      if (lyricsWithIds[i].time <= currentTime) {
        index = i
      } else {
        break
      }
    }
    return index
  })()
  const currentLyricId = currentLyricIndex >= 0 ? lyricsWithIds[currentLyricIndex]?.id : undefined
  const hasLyrics = lyricsTyped && (lyricsTyped.plainLyrics || lyricsTyped.syncedLyrics)

  // Extract colors from album cover for dynamic gradient
  useEffect(() => {
    const extractColors = async () => {
      if (currentTrack?.album?.coverImageUrl) {
        try {
          const palette = await extractColorsFromImage(currentTrack.album.coverImageUrl)
          const gradient = generateGradientFromPalette(palette)
          setDynamicGradient(gradient)
        } catch (error) {
          console.warn('Color extraction failed, using genre gradient:', error)
          // Fallback to genre-based gradient
          const genreGradient = genreGradients[currentTrack.genre || 'default'] || genreGradients.default
          setDynamicGradient(genreGradient)
        }
      } else {
        // No cover image, use genre gradient
        const genreGradient = genreGradients[currentTrack?.genre || 'default'] || genreGradients.default
        setDynamicGradient(genreGradient)
      }
    }

    if (currentTrack && isOpen) {
      extractColors()
    }
  }, [currentTrack, isOpen])

  // Auto-scroll to keep current lyric line centered/at top
  useEffect(() => {
    if (lyricsContainerRef.current && currentLyricId && showLyrics) {
      const currentElement = lyricsContainerRef.current.querySelector(`[data-lyric-id="${currentLyricId}"]`)
      if (currentElement) {
        const container = lyricsContainerRef.current
        
        // Calculate scroll position to center the current lyric near the top
        const targetPosition = (currentElement as HTMLElement).offsetTop - container.clientHeight * 0.3
        
        container.scrollTo({ 
          top: Math.max(0, targetPosition),
          behavior: 'smooth'
        })
      }
    }
  }, [currentLyricId, showLyrics])

  // Event handlers that use the global context
  const handleSeek = (value: number[]) => {
    const newTime = (value[0] / 100) * duration
    seekTo(newTime)
  }

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0] / 100
    setGlobalVolume(newVolume)
  }

  if (!currentTrack || !isOpen) return null

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full h-full max-w-full max-h-full p-0 border-0 bg-transparent" forceMount>
        <DialogTitle asChild>
          <VisuallyHidden.Root>
            {currentTrack.title} - {currentTrack.artist.name}
          </VisuallyHidden.Root>
        </DialogTitle>
        
        <div className="relative w-full h-full overflow-hidden">
          {/* Blurred Cover Background */}
          {currentTrack.album?.coverImageUrl && (
            <div className="absolute inset-0 -z-10">
              <Image
                src={currentTrack.album.coverImageUrl}
                alt="Cover background"
                fill
                priority
                className="object-cover blur-3xl scale-110 opacity-70"
              />
            </div>
          )}

          {/* Dynamic Gradient Overlay */}
          <div
            className="absolute inset-0 transition-all duration-1000"
            style={{
              background: dynamicGradient || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              mixBlendMode: 'multiply'
            }}
          />

          {/* Dim overlay for contrast */}
          <div className="absolute inset-0 bg-black/40" />
          
          {/* Close Button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-6 right-6 z-50 text-white hover:bg-white/20"
            onClick={onClose}
          >
            <Minimize2 className="h-6 w-6" />
          </Button>

          {/* Main Lyrics Area */}
          <div className="relative z-10 h-full flex flex-col">
            {/* Fullscreen Lyrics Display */}
            <div className="flex-1 flex items-center justify-center pt-20 pb-40 px-8 overflow-hidden">
              {showLyrics && hasLyrics ? (
                <div 
                  ref={lyricsContainerRef}
                  className="w-full max-w-7xl h-full overflow-y-auto no-scrollbar relative"
                  style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}
                >
                  <div className="text-center space-y-8 pt-32">
                    {lyricsWithIds.length > 0 ? (
                      // Synced lyrics display - no next line highlighting
                      lyricsWithIds.map((line) => {
                        const isCurrent = currentLyricId === line.id
                        
                        return (
                          <button
                            key={line.id}
                            type="button"
                            data-lyric-id={line.id}
                            className={`block w-full text-4xl md:text-5xl leading-relaxed transition-all duration-500 font-medium text-center py-6 px-8 rounded-lg ${
                              isCurrent
                                ? 'text-white scale-110 transform font-bold drop-shadow-2xl'
                                : 'text-white/40 hover:text-white/70 hover:scale-105'
                            }`}
                            style={{
                              textShadow: isCurrent ? '0 0 30px rgba(255,255,255,0.8)' : 'none'
                            }}
                            onClick={() => seekTo(line.time)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                seekTo(line.time)
                              }
                            }}
                          >
                            {line.text}
                          </button>
                        )
                      })
                    ) : lyricsTyped?.plainLyrics ? (
                      // Plain lyrics display
                      <div className="text-3xl leading-loose text-white/90 whitespace-pre-wrap max-w-4xl mx-auto py-20">
                        {lyricsTyped.plainLyrics}
                      </div>
                    ) : (
                      <div className="text-white/60 text-2xl py-20">
                        Lyrics data found but content is empty
                      </div>
                    )}
                    {/* Add bottom padding to ensure last lyrics are visible */}
                    <div className="h-96" />
                  </div>
                </div>
              ) : (
                // No lyrics - show track info
                <div className="flex items-center justify-center space-x-12 text-white max-w-6xl">
                  {/* Album Cover */}
                  <div className="w-80 h-80 bg-black/30 rounded-2xl shadow-2xl overflow-hidden flex-shrink-0 relative">
                    {currentTrack.album?.coverImageUrl ? (
                      <Image
                        src={currentTrack.album.coverImageUrl}
                        alt={currentTrack.album?.title || 'Album cover'}
                        fill
                        className="object-cover"
                        sizes="320px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white text-8xl">
                        🎵
                      </div>
                    )}
                  </div>
                  
                  {/* Track Info */}
                  <div className="flex-1 space-y-6 text-left">
                    <h1 className="text-6xl font-bold leading-tight">{currentTrack.title}</h1>
                    <h2 className="text-3xl text-white/80">
                      <Link href={`/artists/${currentTrack.artist.id}`} className="hover:underline">
                        {currentTrack.artist.name}
                      </Link>
                      {currentTrack.artist.verified && (
                        <span className="ml-2 text-blue-400">✓</span>
                      )}
                    </h2>
                    {currentTrack.album && (
                      <p className="text-xl text-white/70">
                        {currentTrack.album.title}
                      </p>
                    )}
                    <div className="text-lg text-white/60">
                      {(((currentTrack as { playCount?: number }).playCount ?? 0)).toLocaleString()} plays
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Mini Player at Bottom */}
            <div className="absolute bottom-0 left-0 right-0 bg-black/20 backdrop-blur-md border-t border-white/10 shadow-2xl">
              <div className="max-w-7xl mx-auto px-8 py-6">
                {/* Progress Bar */}
                <div className="mb-4">
                  <Slider
                    value={[progress]}
                    onValueChange={handleSeek}
                    max={100}
                    step={0.1}
                    className="[&>.track]:bg-white/30 [&>.range]:bg-white [&>.thumb]:bg-white"
                  />
                  <div className="flex justify-between text-sm text-white/70 mt-2">
                    <span>{formatDuration(Math.floor(currentTime))}</span>
                    <span>{formatDuration(Math.floor(duration))}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  {/* Left - Track Info */}
                  <div className="flex items-center space-x-4 flex-1 min-w-0">
                    <div className="w-14 h-14 bg-black/30 rounded-lg overflow-hidden flex-shrink-0 relative">
                      {currentTrack.album?.coverImageUrl ? (
                        <Image
                          src={currentTrack.album.coverImageUrl}
                          alt={currentTrack.album?.title || 'Album cover'}
                          fill
                          className="object-cover"
                          sizes="56px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white text-xl">
                          🎵
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-white font-semibold truncate">{currentTrack.title}</h3>
                      <p className="text-white/70 text-sm truncate">{currentTrack.artist.name}</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setIsLiked(!isLiked)}
                      className={`text-white hover:bg-white/20 ${isLiked ? 'text-red-400' : ''}`}
                    >
                      <Heart className={`h-5 w-5 ${isLiked ? 'fill-current' : ''}`} />
                    </Button>
                  </div>

                  {/* Center - Main Controls */}
                  <div className="flex items-center space-x-6">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toggleShuffle}
                      className={`text-white hover:bg-white/20 ${isShuffle ? 'text-green-400' : ''}`}
                    >
                      <Shuffle className="h-5 w-5" />
                    </Button>
                    
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={previousTrack}
                      className="text-white hover:bg-white/20"
                    >
                      <SkipBack className="h-6 w-6" />
                    </Button>
                    
                    <Button
                      size="lg"
                      onClick={togglePlayPause}
                      className="w-12 h-12 rounded-full bg-white text-black hover:bg-gray-100"
                    >
                      {isPlaying ? (
                        <Pause className="h-6 w-6" />
                      ) : (
                        <Play className="h-6 w-6 ml-1" />
                      )}
                    </Button>
                    
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={nextTrack}
                      className="text-white hover:bg-white/20"
                    >
                      <SkipForward className="h-6 w-6" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toggleRepeat}
                      className={`text-white hover:bg-white/20 relative ${isRepeat ? 'text-green-400' : ''}`}
                      title={repeatMode === 'track' ? 'Repeat Track' : repeatMode === 'playlist' ? 'Repeat Playlist' : 'Repeat Off'}
                    >
                      <Repeat className="h-5 w-5" />
                      {repeatMode === 'track' && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full" />
                      )}
                    </Button>
                  </div>

                  {/* Right - Extra Controls */}
                  <div className="flex items-center space-x-4 flex-1 justify-end">
                    {hasLyrics && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setShowLyrics(!showLyrics)}
                        className={`text-white hover:bg-white/20 ${showLyrics ? 'text-green-400' : ''}`}
                      >
                        <Mic className="h-5 w-5" />
                      </Button>
                    )}
                    
                    <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
                      <Share className="h-5 w-5" />
                    </Button>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={toggleMute}
                        className="text-white hover:bg-white/20"
                      >
                        {isMuted || volume === 0 ? (
                          <VolumeX className="h-5 w-5" />
                        ) : (
                          <Volume2 className="h-5 w-5" />
                        )}
                      </Button>
                      <div className="w-24">
                        <Slider
                          value={[isMuted ? 0 : volume * 100]}
                          onValueChange={handleVolumeChange}
                          max={100}
                          step={1}
                          className="[&>.track]:bg-white/30 [&>.range]:bg-white [&>.thumb]:bg-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}