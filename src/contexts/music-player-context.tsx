"use client"

import { type ReactNode, createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import type { Track } from '@/types/track'
import { useMediaSession } from '@/hooks/useMediaSession'
import { WebScrobblerMetadata } from '@/components/web-scrobbler-metadata'

interface MusicPlayerContextType {
  // Current track state
  currentTrack: Track | null
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  isMuted: boolean
  
  // Playback control state
  isRepeat: boolean
  isShuffle: boolean
  repeatMode: 'off' | 'track' | 'playlist'
  queue: Track[]
  currentIndex: number
  
  // Player actions
  playTrack: (track: Track, trackList?: Track[], context?: { type: 'playlist' | 'album' | 'standalone'; id?: string; name?: string }) => void
  togglePlayPause: () => void
  stopPlayback: () => void
  seekTo: (seconds: number) => void
  setVolume: (volume: number) => void
  toggleMute: () => void
  
  // Navigation actions
  nextTrack: () => void
  previousTrack: () => void
  toggleRepeat: () => void
  toggleShuffle: () => void
  
  // Queue actions
  setQueue: (tracks: Track[], startIndex?: number) => void
  
  // Audio element ref for components that need direct access
  audioRef: React.RefObject<HTMLAudioElement>
  
  // Utility functions
  isCurrentTrack: (trackId: string) => boolean
}

const MusicPlayerContext = createContext<MusicPlayerContextType | undefined>(undefined)

// Utility function to shuffle array
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export function MusicPlayerProvider({ children }: { children: ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolumeState] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  
  // Playback control state
  const [isRepeat, setIsRepeat] = useState(false)
  const [isShuffle, setIsShuffle] = useState(false)
  const [repeatMode, setRepeatMode] = useState<'off' | 'track' | 'playlist'>('off')
  
  // Playback context - to know if we're in a playlist/album vs standalone
  const [playbackContext, setPlaybackContext] = useState<{
    type: 'playlist' | 'album' | 'standalone' | null
    id?: string
    name?: string
  }>({ type: null })
  const [queue, setQueueState] = useState<Track[]>([])
  const [currentIndex, setCurrentIndex] = useState(-1)
  
  const audioRef = useRef<HTMLAudioElement>(null)
  const shouldAutoPlayRef = useRef<boolean>(false)

  // Function to fetch recommended tracks
  const fetchRecommendedTracks = useCallback(async (currentTrack: Track) => {
    try {
      console.log('🎯 Fetching recommended tracks...')
      const params = new URLSearchParams({
        limit: '10',
        offset: '0',
      })
      
      // Add genre filter if current track has a genre
      if (currentTrack.genre) {
        params.set('genre', currentTrack.genre)
      }
      
      const response = await fetch(`/api/tracks?${params}`)
      if (!response.ok) throw new Error('Failed to fetch recommendations')
      
      const data = await response.json()
      // Filter out the current track and any already in queue
      const recommendations = data.tracks.filter((track: Track) => 
        track.id !== currentTrack.id && 
        !queue.find(queueTrack => queueTrack.id === track.id)
      ).slice(0, 5) // Get top 5 recommendations
      
      console.log('✅ Found recommendations:', recommendations.length)
      return recommendations
    } catch (error) {
      console.error('❌ Failed to fetch recommendations:', error)
      return []
    }
  }, [queue])

  // Helper function for advancing to next track
  const handleNextTrack = useCallback(async () => {
    if (queue.length === 0) return
    
    let nextIndex = currentIndex + 1
    if (nextIndex >= queue.length) {
      // End of queue - decide what to do based on context and repeat mode
      if (repeatMode === 'playlist' || playbackContext.type === 'playlist' || playbackContext.type === 'album') {
        // Loop playlist/album from the start
        console.log('🔄 Looping playlist/album from start')
        nextIndex = 0
      } else {
        // Standalone playback - fetch recommendations and add to queue
        console.log('🎯 End of queue, fetching recommendations...')
        if (currentTrack) {
          const recommendations = await fetchRecommendedTracks(currentTrack)
          if (recommendations.length > 0) {
            console.log('➕ Adding recommendations to queue')
            const newQueue = [...queue, ...recommendations]
            setQueueState(newQueue)
            // Continue to first recommendation
            nextIndex = queue.length
            // Update queue length check below
            setCurrentIndex(nextIndex)
            setCurrentTrack(newQueue[nextIndex])
            setIsPlaying(true)
            shouldAutoPlayRef.current = true // Mark for auto-play when ready
            return
          } else {
            console.log('⏹️ No recommendations found, stopping playback')
            return // No recommendations, stop playback
          }
        } else {
          return // No current track, stop playback
        }
      }
    }
    
    // Normal queue navigation (looping back to start)
    setCurrentIndex(nextIndex)
    setCurrentTrack(queue[nextIndex])
    setIsPlaying(true)
    shouldAutoPlayRef.current = true // Mark for auto-play when ready
  }, [queue, currentIndex, repeatMode, playbackContext, currentTrack, fetchRecommendedTracks])

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime)
    const handleLoadedMetadata = () => setDuration(audio.duration)
    const handleEnded = () => {
      console.log('🔚 Track ended naturally')
      
      if (repeatMode === 'track') {
        // Repeat current track
        console.log('🔁 Repeating current track')
        audio.currentTime = 0
        setCurrentTime(0)
        const playPromise = audio.play()
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.error('❌ Repeat play failed:', error)
            setIsPlaying(false)
          })
        }
        return
      }
      
      setIsPlaying(false)
      // Auto-advance to next track if queue exists and not single track repeat
      if (queue.length > 1) {
        // Small delay to prevent immediate replay
        setTimeout(() => {
          handleNextTrack()
        }, 500)
      }
    }
    const handleCanPlay = () => {
      console.log('✅ Track can play')
    }
    const handleError = (e: Event) => {
      const audioError = (e.target as HTMLAudioElement)?.error
      console.error('❌ Audio error:', {
        code: audioError?.code,
        message: audioError?.message,
        networkState: (e.target as HTMLAudioElement)?.networkState,
        readyState: (e.target as HTMLAudioElement)?.readyState
      })
      setIsPlaying(false)
    }
    const handlePause = () => {
      console.log('⏸️ Audio paused')
    }
    const handlePlay = () => {
      console.log('▶️ Audio playing')
    }

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('canplay', handleCanPlay)
    audio.addEventListener('error', handleError)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('play', handlePlay)

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('canplay', handleCanPlay)
      audio.removeEventListener('error', handleError)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('play', handlePlay)
    }
  }, [handleNextTrack, queue.length, repeatMode])

  // Handle track changes
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !currentTrack) return

    console.log('🔄 Loading new track:', currentTrack.title)
    console.log('🔗 Track ID:', currentTrack.id)
    console.log('🔗 Audio URL:', currentTrack.filePath)
    
    // Reset current time immediately
    setCurrentTime(0)
    
    // Check if track has a valid file path
    if (!currentTrack.filePath) {
      console.error('❌ Track has no file path:', currentTrack.title)
      setError('Track file not found')
      setIsPlaying(false)
      return
    }
    
    // Set new audio source and load with cache-busting parameter
    let audioSrc = currentTrack.filePath
    if (audioSrc.includes('?')) {
      audioSrc = audioSrc + '&t=' + Date.now()
    } else {
      audioSrc = audioSrc + '?t=' + Date.now()
    }
    
    audio.src = audioSrc
    console.log('🎵 Loading track:', currentTrack.title)
    console.log('🎵 Audio src:', audioSrc)
    audio.load()
    
    // Add event listener to handle when audio is ready to play
    const handleCanPlayThrough = () => {
      console.log('✅ Audio ready to play through')
      // If we should be playing, start playing now that audio is ready
      if (shouldAutoPlayRef.current) {
        console.log('▶️ Auto-playing newly loaded track')
        shouldAutoPlayRef.current = false // Reset the flag
        const playPromise = audio.play()
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.error('❌ Auto-play failed:', error)
            setIsPlaying(false)
          })
        }
      }
      // Remove the event listener as it's only needed once per track load
      audio.removeEventListener('canplaythrough', handleCanPlayThrough)
    }
    
    audio.addEventListener('canplaythrough', handleCanPlayThrough)
    
    // Cleanup function to remove event listener if component unmounts or track changes
    return () => {
      audio.removeEventListener('canplaythrough', handleCanPlayThrough)
    }
  }, [currentTrack])

  // Handle play/pause changes (for same track toggle, not new track loads)
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !currentTrack) return

    if (isPlaying) {
      // Only try to play if the audio source is already loaded and ready
      // This handles resume/play for already loaded tracks
      if (audio.src && audio.readyState >= 3) { // HAVE_FUTURE_DATA or better (more strict for smooth playback)
        console.log('▶️ Resuming/playing current track...')
        const playPromise = audio.play()
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log('✅ Play/resume successful')
            })
            .catch(error => {
              console.error('❌ Play/resume failed:', error)
              // Only set isPlaying to false if it's a real error, not a user abort
              if (error.name !== 'AbortError') {
                setIsPlaying(false)
              }
            })
        }
      }
      // For newly loaded tracks, play is handled in the canplaythrough event
    } else {
      console.log('⏸️ Pausing...')
      audio.pause()
    }
  }, [isPlaying, currentTrack])

  // Handle volume changes
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    audio.volume = isMuted ? 0 : volume
  }, [volume, isMuted])

  const playTrack = useCallback((
    track: Track, 
    trackList?: Track[], 
    context?: { type: 'playlist' | 'album' | 'standalone'; id?: string; name?: string }
  ) => {
    console.log('🎵 Playing track:', track.title, 'by', track.artist.name)
    console.log('🔗 File path:', track.filePath)
    
    // Set playback context
    if (context) {
      setPlaybackContext(context)
    } else if (trackList && trackList.length > 1) {
      // Infer context from trackList
      setPlaybackContext({ type: 'standalone' })
    } else {
      setPlaybackContext({ type: 'standalone' })
    }
    
    if (currentTrack?.id === track.id) {
      // If it's the same track, toggle play/pause
      setIsPlaying(!isPlaying)
    } else {
      // New track - set up queue if provided
      if (trackList && trackList.length > 0) {
        const trackIndex = trackList.findIndex(t => t.id === track.id)
        if (trackIndex !== -1) {
          if (isShuffle) {
            // Create shuffled queue but ensure current track is at index 0
            const shuffledTracks = shuffleArray([...trackList])
            const currentTrackInShuffled = shuffledTracks.findIndex(t => t.id === track.id)
            if (currentTrackInShuffled !== -1) {
              // Swap current track to position 0
              [shuffledTracks[0], shuffledTracks[currentTrackInShuffled]] = 
              [shuffledTracks[currentTrackInShuffled], shuffledTracks[0]]
            }
            setQueueState(shuffledTracks)
            setCurrentIndex(0)
          } else {
            setQueueState(trackList)
            setCurrentIndex(trackIndex)
          }
        }
      } else if (queue.length === 0) {
        // If no queue exists, create a single-track queue
        setQueueState([track])
        setCurrentIndex(0)
      } else {
        // Update current index in existing queue
        const existingIndex = queue.findIndex(t => t.id === track.id)
        if (existingIndex !== -1) {
          setCurrentIndex(existingIndex)
        } else {
          // Track not in queue, add it and play
          setQueueState([...queue, track])
          setCurrentIndex(queue.length)
        }
      }
      
      setCurrentTrack(track)
      setIsPlaying(true)
      shouldAutoPlayRef.current = true // Mark for auto-play when ready
    }
  }, [currentTrack, isPlaying, queue, isShuffle])

  const togglePlayPause = useCallback(() => {
    setIsPlaying(!isPlaying)
  }, [isPlaying])

  const stopPlayback = useCallback(() => {
    setIsPlaying(false)
    setCurrentTrack(null)
  }, [])

  const seekTo = useCallback((seconds: number) => {
    const audio = audioRef.current
    if (audio) {
      audio.currentTime = seconds
      setCurrentTime(seconds)
    }
  }, [])

  const setVolume = useCallback((newVolume: number) => {
    setVolumeState(newVolume)
    setIsMuted(newVolume === 0)
  }, [])

  const toggleMute = useCallback(() => {
    setIsMuted(!isMuted)
  }, [isMuted])

  const isCurrentTrack = useCallback((trackId: string) => {
    return currentTrack?.id === trackId
  }, [currentTrack])

  // Navigation functions
  const nextTrack = useCallback(() => {
    handleNextTrack()
  }, [handleNextTrack])

  const previousTrack = useCallback(() => {
    if (queue.length === 0) return
    
    // If we're at the beginning, decide what to do based on repeat setting
    let prevIndex = currentIndex - 1
    if (prevIndex < 0) {
      if (repeatMode === 'playlist') {
        prevIndex = queue.length - 1 // Go to last track if playlist repeat is on
      } else {
        return // Do nothing if no repeat or only track repeat
      }
    }
    
    setCurrentIndex(prevIndex)
    setCurrentTrack(queue[prevIndex])
    setIsPlaying(true)
    shouldAutoPlayRef.current = true // Mark for auto-play when ready
  }, [queue, currentIndex, repeatMode])

  const toggleRepeat = useCallback(() => {
    const nextMode = repeatMode === 'off' ? 'track' : 
                     repeatMode === 'track' ? 'playlist' : 'off'
    setRepeatMode(nextMode)
    setIsRepeat(nextMode !== 'off')
  }, [repeatMode])

  const toggleShuffle = useCallback(() => {
    const newShuffleState = !isShuffle
    setIsShuffle(newShuffleState)
    
    if (queue.length > 1 && currentTrack) {
      if (newShuffleState) {
        // Enable shuffle - randomize remaining tracks after current
        const currentTrackItem = currentTrack
        const remainingTracks = queue.slice(currentIndex + 1)
        const previousTracks = queue.slice(0, currentIndex)
        
        const shuffledRemaining = shuffleArray(remainingTracks)
        const shuffledPrevious = shuffleArray(previousTracks)
        
        // Rebuild queue: shuffled previous + current + shuffled remaining
        const newQueue = [
          ...shuffledPrevious,
          currentTrackItem,
          ...shuffledRemaining
        ]
        
        setQueueState(newQueue)
        setCurrentIndex(shuffledPrevious.length) // Current track position in new queue
      } else {
        // Disable shuffle - keep current order for now
        // In a more advanced implementation, you could restore the original order
        console.log('🔀 Shuffle disabled - keeping current queue order')
      }
    }
  }, [isShuffle, queue, currentTrack, currentIndex])

  const setQueue = useCallback((tracks: Track[], startIndex: number = 0) => {
    setQueueState(tracks)
    setCurrentIndex(startIndex)
    if (tracks.length > 0 && startIndex < tracks.length) {
      setCurrentTrack(tracks[startIndex])
      shouldAutoPlayRef.current = true // Mark for auto-play when ready
    }
  }, [])

  // Media Session API integration for browser controls and notifications
  useMediaSession({
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    onPlay: () => setIsPlaying(true),
    onPause: () => setIsPlaying(false),
    onNextTrack: nextTrack,
    onPreviousTrack: previousTrack,
    onSeekTo: seekTo,
  })

  const value: MusicPlayerContextType = {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    isRepeat,
    isShuffle,
    repeatMode,
    queue,
    currentIndex,
    playTrack,
    togglePlayPause,
    stopPlayback,
    seekTo,
    setVolume,
    toggleMute,
    nextTrack,
    previousTrack,
    toggleRepeat,
    toggleShuffle,
    setQueue,
    audioRef,
    isCurrentTrack,
  }

  return (
    <MusicPlayerContext.Provider value={value}>
      {/* Global audio element */}
      <audio ref={audioRef} aria-label="Music player">
        <track kind="captions" />
      </audio>
      
      {/* Web Scrobbler metadata for Last.fm scrobbling */}
      <WebScrobblerMetadata
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
      />
      
      {children}
    </MusicPlayerContext.Provider>
  )
}

export function useMusicPlayer() {
  const context = useContext(MusicPlayerContext)
  if (context === undefined) {
    throw new Error('useMusicPlayer must be used within a MusicPlayerProvider')
  }
  return context
}

export default MusicPlayerContext
