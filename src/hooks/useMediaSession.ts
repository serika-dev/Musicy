"use client"

import { useEffect } from 'react'
import type { Track } from '@/types/track'

interface UseMediaSessionProps {
  currentTrack: Track | null
  isPlaying: boolean
  currentTime: number
  duration: number
  onPlay: () => void
  onPause: () => void
  onNextTrack: () => void
  onPreviousTrack: () => void
  onSeekTo: (time: number) => void
}

export function useMediaSession({
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  onPlay,
  onPause,
  onNextTrack,
  onPreviousTrack,
  onSeekTo,
}: UseMediaSessionProps) {
  
  // Update document title with current track info
  useEffect(() => {
    if (currentTrack) {
      const title = `${currentTrack.title} • ${currentTrack.artist.name} • Musicy`
      document.title = isPlaying ? `▶️ ${title}` : `⏸️ ${title}`
    } else {
      document.title = 'Musicy - Lossless Music Streaming'
    }
    
    // Cleanup on unmount
    return () => {
      document.title = 'Musicy - Lossless Music Streaming'
    }
  }, [currentTrack, isPlaying])

  // Media Session API integration
  useEffect(() => {
    if (!('mediaSession' in navigator)) {
      console.warn('Media Session API not supported')
      return
    }

    if (currentTrack) {
      // Set media metadata
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist.name,
        album: currentTrack.album?.title || 'Unknown Album',
        artwork: currentTrack.album?.coverImageUrl ? [
          {
            src: currentTrack.album.coverImageUrl,
            sizes: '512x512',
            type: 'image/jpeg',
          },
          {
            src: currentTrack.album.coverImageUrl,
            sizes: '256x256', 
            type: 'image/jpeg',
          },
          {
            src: currentTrack.album.coverImageUrl,
            sizes: '128x128',
            type: 'image/jpeg',
          }
        ] : [
          {
            src: '/favicon.ico',
            sizes: '48x48',
            type: 'image/x-icon',
          }
        ],
      })

      // Set playback state
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused'

      // Set position state if available
      if (duration > 0) {
        navigator.mediaSession.setPositionState({
          duration,
          playbackRate: 1,
          position: currentTime,
        })
      }
    } else {
      // Clear metadata when no track
      navigator.mediaSession.metadata = null
      navigator.mediaSession.playbackState = 'none'
    }
  }, [currentTrack, isPlaying, currentTime, duration])

  // Set up media session action handlers
  useEffect(() => {
    if (!('mediaSession' in navigator)) return

    const handlePlay = () => {
      console.log('🎮 Media Session: Play')
      onPlay()
    }

    const handlePause = () => {
      console.log('🎮 Media Session: Pause')
      onPause()
    }

    const handleNextTrack = () => {
      console.log('🎮 Media Session: Next track')
      onNextTrack()
    }

    const handlePreviousTrack = () => {
      console.log('🎮 Media Session: Previous track')
      onPreviousTrack()
    }

    const handleSeekTo = (details: { seekTime?: number }) => {
      if (details.seekTime !== undefined) {
        console.log('🎮 Media Session: Seek to', details.seekTime)
        onSeekTo(details.seekTime)
      }
    }

    // Set action handlers
    navigator.mediaSession.setActionHandler('play', handlePlay)
    navigator.mediaSession.setActionHandler('pause', handlePause)
    navigator.mediaSession.setActionHandler('nexttrack', handleNextTrack)
    navigator.mediaSession.setActionHandler('previoustrack', handlePreviousTrack)
    navigator.mediaSession.setActionHandler('seekto', handleSeekTo)

    // Cleanup
    return () => {
      try {
        navigator.mediaSession.setActionHandler('play', null)
        navigator.mediaSession.setActionHandler('pause', null)
        navigator.mediaSession.setActionHandler('nexttrack', null)
        navigator.mediaSession.setActionHandler('previoustrack', null)
        navigator.mediaSession.setActionHandler('seekto', null)
      } catch (error) {
        console.warn('Error cleaning up media session handlers:', error)
      }
    }
  }, [onPlay, onPause, onNextTrack, onPreviousTrack, onSeekTo])
}
