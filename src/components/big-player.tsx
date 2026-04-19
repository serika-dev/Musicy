'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useMusicPlayer } from '@/contexts/music-player-context'
import { useLyrics, parseSyncedLyrics, type LyricsData, type ParsedLyricLine } from '@/hooks/useLyrics'
import { useSettings } from '@/hooks/useSettings'
import { useRomanizedLyrics } from '@/hooks/useRomanizedLyrics'
import { extractColorsFromImage, generateGradientFromPalette, genreGradients } from '@/lib/color-extractor'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import { useIsTrackLiked, useLikeTrack, useUnlikeTrack } from '@/hooks/useLikedSongs'
import { 
  ChevronDown,
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
  Mic,
  Download
} from 'lucide-react'
import { DownloadButton } from './download-button'
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
  const [dynamicGradient, setDynamicGradient] = useState<string | null>(null)
  
  const mobileLyricsContainerRef = useRef<HTMLDivElement>(null)
  const desktopLyricsContainerRef = useRef<HTMLDivElement>(null)
  
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
    setLocalLike(newState) // Optimistic UI jump
    if (newState) {
      likeTrack(currentTrack.id)
    } else {
      unlikeTrack(currentTrack.id)
    }
  }
  
  // Fetch lyrics for current track
  const { data: lyricsData } = useLyrics(currentTrack?.id)
  const lyricsTyped = lyricsData as LyricsData | undefined
  const parsedSyncedLyrics: ParsedLyricLine[] = lyricsTyped?.syncedLyrics ? parseSyncedLyrics(lyricsTyped.syncedLyrics) : []
  
  // Helper function to create CSS-safe IDs
  const sanitizeForCSS = (text: string): string => {
    return text
      // Remove or replace problematic characters that break CSS selectors
      .replace(/['"\\\/\[\](){}:;.,!?@#$%^&*+=|`~<>]/g, '') // Remove special chars
      .replace(/\s+/g, '-') // Replace spaces with dashes
      .replace(/[^\w-]/g, '') // Keep only alphanumeric, underscore, and dash
      .replace(/^-+|-+$/g, '') // Remove leading/trailing dashes
      .replace(/-+/g, '-') // Replace multiple dashes with single dash
      .toLowerCase() // Convert to lowercase for consistency
      .substring(0, 50) // Limit length to prevent overly long IDs
  }
  
  // Add unique IDs to parsed lyrics to prevent duplicate highlighting
  const lyricsWithIds: (ParsedLyricLine & { id: string })[] = parsedSyncedLyrics.map((line, index) => ({
    ...line,
    id: `${currentTrack?.id}-${index}-${line.time}-${sanitizeForCSS(line.text)}`
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

  // Romanization support (server caches in DB — instant after first compute)
  const { settings } = useSettings()
  const romanizeEnabled = settings.autoRomanizeLyrics

  const { data: romanizedSyncedLrc } = useRomanizedLyrics(
    currentTrack?.id,
    'synced',
    romanizeEnabled && lyricsWithIds.length > 0,
    settings.romanizeLanguage
  )
  const { data: romanizedPlain } = useRomanizedLyrics(
    currentTrack?.id,
    'plain',
    romanizeEnabled && !!lyricsTyped?.plainLyrics && lyricsWithIds.length === 0,
    settings.romanizeLanguage
  )

  // The romanized synced lyrics come back as a full LRC. Parse and map by
  // timestamp to the original lyricsWithIds so we keep the existing keys/IDs.
  const romanizedLinesMap = (() => {
    if (!romanizeEnabled || !romanizedSyncedLrc || lyricsWithIds.length === 0) return null
    const parsed = parseSyncedLyrics(romanizedSyncedLrc)
    if (parsed.length === 0) return null
    const byTime: Record<number, string> = {}
    parsed.forEach(p => { byTime[Math.round(p.time * 100)] = p.text })
    const map: Record<string, string> = {}
    lyricsWithIds.forEach(line => {
      const key = Math.round(line.time * 100)
      if (byTime[key]) map[line.id] = byTime[key]
    })
    return Object.keys(map).length > 0 ? map : null
  })()

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
    const handleScroll = (containerRef: React.RefObject<HTMLDivElement | null>) => {
      if (containerRef.current && currentLyricId && showLyrics) {
        const container = containerRef.current
        if (container.clientHeight > 0) {
          const currentElement = container.querySelector(`[data-lyric-id="${currentLyricId}"]`)
          if (currentElement) {
            const targetPosition = (currentElement as HTMLElement).offsetTop - container.clientHeight * 0.3
            container.scrollTo({ 
              top: Math.max(0, targetPosition),
              behavior: 'smooth'
            })
          }
        }
      }
    }
    
    handleScroll(mobileLyricsContainerRef)
    handleScroll(desktopLyricsContainerRef)
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

  const renderLyricsContent = (isMobile: boolean) => (
    <div className={`text-center space-y-8 ${isMobile ? 'pt-8' : 'pt-32'}`}>
      {lyricsWithIds.length > 0 ? (
        (() => {
          const maxLen = lyricsWithIds.reduce((m, l) => {
            const r = romanizedLinesMap?.[l.id]
            const t = (romanizeEnabled && r && r !== l.text) ? r : l.text
            return Math.max(m, (t || '').length)
          }, 0)
          const sizeClass = maxLen > 80 ? (isMobile ? 'text-2xl' : 'text-3xl lg:text-4xl')
                          : maxLen > 55 ? (isMobile ? 'text-3xl' : 'text-4xl lg:text-5xl')
                          : maxLen > 35 ? (isMobile ? 'text-4xl' : 'text-5xl lg:text-7xl')
                          : (isMobile ? 'text-5xl' : 'text-7xl lg:text-9xl')
          return lyricsWithIds.map((line) => {
            const isCurrent = currentLyricId === line.id
            const romanized = romanizedLinesMap?.[line.id]
            const showRomanized = romanizeEnabled && romanized && romanized !== line.text
            const showBoth = showRomanized && settings.showRomanizationAlongside
            return (
              <button
                key={line.id}
                type="button"
                data-lyric-id={line.id}
                className={`block w-full ${sizeClass} leading-relaxed transition-all duration-500 font-medium text-center py-10 px-4 lg:px-8 rounded-lg break-words whitespace-normal [overflow-wrap:anywhere] ${
                  isCurrent ? 'text-white scale-[1.04] transform font-bold drop-shadow-2xl' : 'text-white/40 hover:text-white/70 hover:scale-[1.02]'
                }`}
                style={{ textShadow: isCurrent ? '0 0 40px rgba(255,255,255,0.9)' : 'none' }}
                onClick={() => seekTo(line.time)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); seekTo(line.time) }
                }}
              >
                {showBoth ? (
                  <>
                    <div>{line.text}</div>
                    <div className="text-lg md:text-xl opacity-70 font-normal mt-2 italic break-words [overflow-wrap:anywhere]">
                      {romanized}
                    </div>
                  </>
                ) : showRomanized ? romanized : line.text}
              </button>
            )
          })
        })()
      ) : lyricsTyped?.plainLyrics ? (
        <div className="text-2xl leading-loose text-white/90 whitespace-pre-wrap max-w-4xl mx-auto py-10">
          {romanizeEnabled && romanizedPlain && romanizedPlain !== lyricsTyped.plainLyrics ? (
            settings.showRomanizationAlongside ? (
              <>
                <div>{lyricsTyped.plainLyrics}</div>
                <div className="opacity-70 italic mt-6">{romanizedPlain}</div>
              </>
            ) : romanizedPlain
          ) : lyricsTyped.plainLyrics}
        </div>
      ) : (
        <div className="text-white/60 text-xl py-10">Lyrics data found but content is empty</div>
      )}
      <div className={isMobile ? "h-32" : "h-96"} />
    </div>
  )

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full h-full max-w-full max-h-full p-0 border-0 bg-transparent [&>button.absolute]:hidden" forceMount>
        <DialogTitle asChild>
          <VisuallyHidden.Root>{currentTrack.title} - {currentTrack.artist.name}</VisuallyHidden.Root>
        </DialogTitle>
        <div className="relative w-full h-full overflow-hidden bg-black flex flex-col">
          {/* Blurred Cover Background */}
          {currentTrack.album?.coverImageUrl && (
            <div className="absolute inset-0 -z-10 bg-black">
              <Image src={currentTrack.album.coverImageUrl} alt="Cover" fill priority className="object-cover blur-[60px] scale-150 opacity-50" sizes="50vw" />
            </div>
          )}
          {/* Dynamic Gradient Overlay */}
          <div className="absolute inset-0 transition-all duration-1000" style={{ background: dynamicGradient || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', mixBlendMode: 'multiply' }} />
          <div className="absolute inset-0 bg-black/40" />
          
          {/* Close Button Top Right (Desktop + Mobile lyrics mode) */}
          <Button variant="ghost" size="icon" className="absolute top-6 right-6 z-50 text-white hover:bg-white/20 hidden lg:flex" onClick={onClose}>
            <Minimize2 className="h-6 w-6" />
          </Button>

          {/* MOBILE UI BLOCK (Spotify Clone) */}
          <div className="relative z-10 flex lg:hidden flex-col h-full w-full px-6 pt-[max(env(safe-area-inset-top),20px)] pb-[max(env(safe-area-inset-bottom),16px)]">
            <div className="flex items-center justify-between z-50 relative shrink-0 mb-4">
              <Button onClick={onClose} variant="ghost" size="icon" className="text-white hover:bg-white/20 -ml-2">
                <ChevronDown className="h-8 w-8" />
              </Button>
              <div className="text-xs font-bold tracking-widest uppercase text-white/80 truncate px-4">
                Now Playing
              </div>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 -mr-2 opacity-0 pointer-events-none">
                <Share className="h-6 w-6" />
              </Button>
            </div>

            {showLyrics && hasLyrics ? (
              <div className="flex-1 flex flex-col min-h-0">
                {/* Mini Header for Lyrics Mode */}
                <div className="flex items-center space-x-4 mb-4 shrink-0">
                  <div className="w-14 h-14 bg-black/30 shadow-xl overflow-hidden relative rounded align-top">
                    {currentTrack.album?.coverImageUrl ? (
                      <Image src={currentTrack.album.coverImageUrl} alt="Cover" fill className="object-cover" sizes="56px" />
                    ) : ( <div className="w-full h-full flex items-center justify-center text-xl">🎵</div> )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-base truncate text-white">{currentTrack.title}</h3>
                    <p className="text-white/70 text-sm truncate">{currentTrack.artist.name}</p>
                  </div>
                </div>
                {/* Lyrics Container Mobile */}
                <div ref={mobileLyricsContainerRef} className="flex-1 overflow-y-auto no-scrollbar relative w-full px-2" style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
                  {renderLyricsContent(true)}
                </div>
                {/* Compact Bottom Controls */}
                <div className="shrink-0 pt-4 px-2">
                  <div className="w-full bg-black/40 rounded-xl p-4 backdrop-blur-md border border-white/5">
                    <div className="flex justify-between items-center w-full min-w-0 flex-1">
                      <div className="flex-1 mr-4 min-w-0">
                        <Slider value={[progress]} onValueChange={handleSeek} max={100} step={0.1} className="[&>.track]:bg-white/30 [&>.range]:bg-white [&>.thumb]:bg-white" />
                      </div>
                      <Button onClick={togglePlayPause} className="w-12 h-12 rounded-full bg-white text-black hover:bg-gray-200 shadow-xl shrink-0">
                        {isPlaying ? <Pause className="h-6 w-6 fill-current" /> : <Play className="h-6 w-6 fill-current ml-1" />}
                      </Button>
                    </div>
                    <div className="flex justify-between items-center mt-3">
                      <div className="flex items-center gap-4">
                         <span className="text-xs text-white/50 w-8">{formatDuration(Math.floor(currentTime))}</span>
                      </div>
                      <div className="flex items-center gap-4">
                         <Button variant="ghost" size="icon" onClick={() => setShowLyrics(false)} className="text-green-400 p-0 h-8 w-8 hover:bg-transparent">
                           <Mic className="h-5 w-5" />
                         </Button>
                         <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 p-0 h-8 w-8">
                           <Share className="h-5 w-5" />
                         </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex-1 flex items-center justify-center pb-4 min-h-0 w-full mt-2">
                  <div className="relative aspect-square mx-auto bg-black/30 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden rounded-xl" style={{ height: 'min(100%, 380px, 45vh)' }}>
                    {currentTrack.album?.coverImageUrl ? (
                      <Image src={currentTrack.album.coverImageUrl} alt="Cover" fill className="object-cover" sizes="400px" priority />
                    ) : ( <div className="w-full h-full flex items-center justify-center text-7xl">🎵</div> )}
                  </div>
                </div>
                {/* Control Panel */}
                <div className="shrink-0 px-2 mt-auto">
                  <div className="flex items-center justify-between mb-6 mt-4">
                    <div className="min-w-0 pr-4">
                      <h1 className="text-2xl font-bold truncate text-white mb-1">{currentTrack.title}</h1>
                      <p className="text-lg text-white/70 truncate">{currentTrack.artist.name}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={handleLikeToggle} className={`hover:bg-transparent -mr-2 ${localLike ? 'text-green-500' : 'text-white'}`}>
                      <Heart className={`h-8 w-8 transition-transform ${localLike ? 'fill-current scale-110' : 'scale-100'}`} />
                    </Button>
                  </div>
                  <div className="mb-6">
                    <Slider value={[progress]} onValueChange={handleSeek} max={100} step={0.1} className="[&>.track]:bg-white/20 [&>.range]:bg-white [&>.thumb]:bg-white" />
                    <div className="flex justify-between text-xs text-white/50 mt-2 font-medium">
                      <span>{formatDuration(Math.floor(currentTime))}</span>
                      <span>-{formatDuration(Math.floor(duration - currentTime))}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mb-6">
                    <Button variant="ghost" size="icon" onClick={toggleShuffle} className={`hover:bg-transparent ${isShuffle ? 'text-green-500' : 'text-white'}`}> <Shuffle className="h-6 w-6" /> </Button>
                    <Button variant="ghost" size="icon" onClick={previousTrack} className="hover:bg-transparent text-white"> <SkipBack className="h-10 w-10 fill-current" /> </Button>
                    <Button onClick={togglePlayPause} className="w-16 h-16 rounded-full bg-white text-black hover:scale-105 transition-transform shadow-xl">
                      {isPlaying ? <Pause className="h-8 w-8 fill-current" /> : <Play className="h-8 w-8 fill-current ml-1" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={nextTrack} className="hover:bg-transparent text-white"> <SkipForward className="h-10 w-10 fill-current" /> </Button>
                    <Button variant="ghost" size="icon" onClick={toggleRepeat} className={`hover:bg-transparent relative ${isRepeat ? 'text-green-500' : 'text-white'}`}>
                      <Repeat className="h-6 w-6" />
                      {repeatMode === 'track' && <div className="absolute top-[2px] right-[2px] w-1.5 h-1.5 bg-green-500 rounded-full" />}
                    </Button>
                  </div>
                  <div className="flex justify-between items-center mt-2 px-1">
                     <Button variant="ghost" size="icon" onClick={() => setShowLyrics(true)} className={`hover:bg-transparent ${hasLyrics ? 'text-white hover:text-white' : 'text-white/20 pointer-events-none'}`}> <Mic className="h-5 w-5" /> </Button>
                     <div className="flex items-center gap-1">
                       <DownloadButton track={currentTrack} />
                       <Button variant="ghost" size="icon" className="hover:bg-transparent text-white/70 hover:text-white"> <Share className="h-5 w-5" /> </Button>
                     </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* DESKTOP UI BLOCK (Original Split Component) */}
          <div className="relative z-10 hidden lg:flex flex-col h-full w-full">
            <div className="flex-1 flex overflow-hidden w-full h-[calc(100%-110px)]">
              {showLyrics && hasLyrics ? (
                <div ref={desktopLyricsContainerRef} className="w-full max-w-7xl mx-auto h-full overflow-y-auto no-scrollbar relative px-12" style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
                  {renderLyricsContent(false)}
                </div>
              ) : (
                <div className="flex flex-col lg:flex-row items-center justify-center space-y-8 lg:space-y-0 lg:space-x-16 text-white w-full max-w-6xl mx-auto px-12 h-full">
                  <div className="w-80 h-80 xl:w-96 xl:h-96 bg-black/30 rounded-2xl shadow-2xl overflow-hidden flex-shrink-0 relative">
                    {currentTrack.album?.coverImageUrl ? (
                      <Image src={currentTrack.album.coverImageUrl} alt="Cover" fill className="object-cover" sizes="400px" />
                    ) : ( <div className="w-full h-full flex items-center justify-center text-8xl">🎵</div> )}
                  </div>
                  <div className="flex flex-col items-center lg:items-start space-y-6 text-center lg:text-left w-full h-full justify-center">
                    <h1 className="text-5xl xl:text-7xl font-bold leading-tight">{currentTrack.title}</h1>
                    <h2 className="text-3xl text-white/80">
                      <Link href={`/artists/${currentTrack.artist.id}`} className="hover:underline">{currentTrack.artist.name}</Link>
                      {currentTrack.artist.verified && <span className="ml-2 text-blue-400">✓</span>}
                    </h2>
                    {currentTrack.album && <p className="text-xl text-white/70">{currentTrack.album.title}</p>}
                    <div className="text-lg text-white/60">{(((currentTrack as any).playCount ?? 0)).toLocaleString()} plays</div>
                  </div>
                </div>
              )}
            </div>

            {/* Desktop Bottom Controller */}
            <div className="absolute bottom-0 left-0 right-0 h-[110px] bg-black/20 backdrop-blur-md border-t border-white/10 shadow-2xl">
              <div className="max-w-7xl mx-auto px-8 py-4 flex flex-col h-full justify-center">
                <div className="mb-2 px-1 relative -top-1">
                  <Slider value={[progress]} onValueChange={handleSeek} max={100} step={0.1} className="[&>.track]:bg-white/30 [&>.range]:bg-white [&>.thumb]:bg-white cursor-pointer" />
                  <div className="flex justify-between text-xs text-white/70 mt-2 absolute w-full left-0 right-0">
                    <span>{formatDuration(Math.floor(currentTime))}</span>
                    <span>{formatDuration(Math.floor(duration))}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between w-full pt-3">
                  <div className="flex items-center space-x-4 flex-1 min-w-0">
                    <div className="w-14 h-14 bg-black/30 rounded-lg overflow-hidden relative">
                      {currentTrack.album?.coverImageUrl ? (
                        <Image src={currentTrack.album.coverImageUrl} alt="Cover" fill className="object-cover" sizes="56px" />
                      ) : ( <div className="w-full h-full flex items-center justify-center text-xl">🎵</div> )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-white font-semibold truncate text-base">{currentTrack.title}</h3>
                      <p className="text-white/70 text-sm truncate">{currentTrack.artist.name}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleLikeToggle} className={`text-white hover:bg-white/20 p-3 ml-2 ${localLike ? 'text-green-500 hover:text-green-400' : ''}`}>
                      <Heart className={`h-6 w-6 transition-transform ${localLike ? 'fill-current scale-110' : 'scale-100'}`} />
                    </Button>
                  </div>
                  <div className="flex items-center justify-center space-x-4 flex-1">
                    <Button variant="ghost" size="sm" onClick={toggleShuffle} className={`text-white hover:bg-white/20 p-3 ${isShuffle ? 'text-green-400' : ''}`}> <Shuffle className="h-5 w-5" /> </Button>
                    <Button variant="ghost" size="sm" onClick={previousTrack} className="text-white hover:bg-white/20 p-3"> <SkipBack className="h-6 w-6 fill-current" /> </Button>
                    <Button onClick={togglePlayPause} className="w-14 h-14 rounded-full bg-white text-black hover:bg-gray-200 transition-transform hover:scale-105 shadow-xl flex items-baseline justify-center shrink-0 items-center">
                      {isPlaying ? <Pause className="h-6 w-6 fill-current" /> : <Play className="h-6 w-6 fill-current ml-1" />}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={nextTrack} className="text-white hover:bg-white/20 p-3"> <SkipForward className="h-6 w-6 fill-current" /> </Button>
                    <Button variant="ghost" size="sm" onClick={toggleRepeat} className={`text-white hover:bg-white/20 p-3 relative ${isRepeat ? 'text-green-400' : ''}`} title={repeatMode === 'track' ? 'Repeat Track' : 'Repeat Playlist'}>
                      <Repeat className="h-5 w-5" />
                      {repeatMode === 'track' && <div className="absolute top-[6px] right-[6px] w-2 h-2 bg-green-400 rounded-full" />}
                    </Button>
                  </div>
                  <div className="flex items-center space-x-4 flex-1 justify-end">
                    <Button variant="ghost" size="sm" onClick={() => setShowLyrics(!showLyrics)} className={`text-white hover:bg-white/20 p-3 ${showLyrics && hasLyrics ? 'text-green-400' : ''} ${!hasLyrics ? 'opacity-30 pointer-events-none' : ''}`}>
                      <Mic className="h-5 w-5" />
                    </Button>
                    <DownloadButton track={currentTrack} />
                    <Button variant="ghost" size="sm" className="text-white hover:bg-white/20 p-3"> <Share className="h-5 w-5" /> </Button>
                    <div className="flex items-center space-x-2 w-36">
                      <Button variant="ghost" size="sm" onClick={toggleMute} className="text-white hover:bg-white/20 p-2 shrink-0">
                        {isMuted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                      </Button>
                      <Slider value={[isMuted ? 0 : volume * 100]} onValueChange={handleVolumeChange} max={100} step={1} className="[&>.track]:bg-white/30 [&>.range]:bg-white [&>.thumb]:bg-white cursor-pointer" />
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
