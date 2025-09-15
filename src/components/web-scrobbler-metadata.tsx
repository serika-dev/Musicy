"use client"

import { useEffect } from 'react'
import type { Track } from '@/types/track'

interface WebScrobblerMetadataProps {
  currentTrack: Track | null
  isPlaying: boolean
  currentTime: number
  duration: number
}

/**
 * Web Scrobbler metadata component
 * 
 * This component creates DOM elements that Web Scrobbler can detect
 * to automatically scrobble tracks to Last.fm, ListenBrainz, etc.
 * 
 * Web Scrobbler looks for specific patterns and selectors on web pages.
 * This implementation uses a generic approach that should work with
 * most Web Scrobbler connectors.
 */
export function WebScrobblerMetadata({ 
  currentTrack, 
  isPlaying, 
  currentTime, 
  duration 
}: WebScrobblerMetadataProps) {

  useEffect(() => {
    // Create or update Web Scrobbler metadata elements
    const updateScrobblerElements = () => {
      // Remove existing elements
      const existingContainer = document.getElementById('web-scrobbler-metadata')
      if (existingContainer) {
        existingContainer.remove()
      }

      if (!currentTrack) return

      // Create container for Web Scrobbler metadata
      const container = document.createElement('div')
      container.id = 'web-scrobbler-metadata'
      container.style.cssText = `
        position: fixed;
        top: -9999px;
        left: -9999px;
        opacity: 0;
        pointer-events: none;
        z-index: -1;
      `

      // Create track info elements with multiple selector patterns
      // that Web Scrobbler might recognize
      const trackElements = [
        // Generic music player selectors
        { class: 'track-title', content: currentTrack.title },
        { class: 'track-artist', content: currentTrack.artist.name },
        { class: 'track-album', content: currentTrack.album?.title || '' },
        { class: 'song-title', content: currentTrack.title },
        { class: 'song-artist', content: currentTrack.artist.name },
        { class: 'song-album', content: currentTrack.album?.title || '' },
        { class: 'artist-name', content: currentTrack.artist.name },
        { class: 'album-name', content: currentTrack.album?.title || '' },
        { class: 'title', content: currentTrack.title },
        { class: 'artist', content: currentTrack.artist.name },
        { class: 'album', content: currentTrack.album?.title || '' },
        // Player state indicators
        { class: 'play-state', content: isPlaying ? 'playing' : 'paused' },
        { class: 'player-state', content: isPlaying ? 'playing' : 'paused' },
      ]

      trackElements.forEach(({ class: className, content }) => {
        if (content) {
          const element = document.createElement('div')
          element.className = className
          element.textContent = content
          element.setAttribute('data-' + className.replace('-', ''), content)
          container.appendChild(element)
        }
      })

      // Add time information
      const currentTimeEl = document.createElement('div')
      currentTimeEl.className = 'current-time'
      currentTimeEl.textContent = currentTime.toString()
      currentTimeEl.setAttribute('data-current-time', currentTime.toString())
      container.appendChild(currentTimeEl)

      const durationEl = document.createElement('div')
      durationEl.className = 'duration'
      durationEl.textContent = duration.toString()
      durationEl.setAttribute('data-duration', duration.toString())
      container.appendChild(durationEl)

      // Add progress information
      const progressEl = document.createElement('div')
      progressEl.className = 'progress'
      const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0
      progressEl.textContent = progressPercent.toString()
      progressEl.setAttribute('data-progress', progressPercent.toString())
      container.appendChild(progressEl)

      // Add additional metadata attributes to container
      container.setAttribute('data-track-id', currentTrack.id)
      container.setAttribute('data-track-title', currentTrack.title)
      container.setAttribute('data-track-artist', currentTrack.artist.name)
      if (currentTrack.album?.title) {
        container.setAttribute('data-track-album', currentTrack.album.title)
      }
      container.setAttribute('data-is-playing', isPlaying.toString())
      container.setAttribute('data-current-time', currentTime.toString())
      container.setAttribute('data-duration', duration.toString())

      // Add to document
      document.body.appendChild(container)

      // Also update page meta tags for additional compatibility
      const updateMetaTag = (name: string, content: string) => {
        let meta = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement
        if (!meta) {
          meta = document.createElement('meta')
          meta.name = name
          document.head.appendChild(meta)
        }
        meta.content = content
      }

      updateMetaTag('music:song', currentTrack.title)
      updateMetaTag('music:musician', currentTrack.artist.name)
      if (currentTrack.album?.title) {
        updateMetaTag('music:album', currentTrack.album.title)
      }
      updateMetaTag('music:duration', Math.round(duration).toString())

      // Open Graph meta tags
      updateMetaTag('og:title', `${currentTrack.title} - ${currentTrack.artist.name}`)
      updateMetaTag('og:description', `Listening to ${currentTrack.title} by ${currentTrack.artist.name} on Musicy`)
      updateMetaTag('og:type', 'music.song')
      if (currentTrack.album?.coverImageUrl) {
        updateMetaTag('og:image', currentTrack.album.coverImageUrl)
      }

      console.log('🎵 Web Scrobbler metadata updated:', {
        title: currentTrack.title,
        artist: currentTrack.artist.name,
        album: currentTrack.album?.title,
        isPlaying,
        currentTime,
        duration
      })
    }

    updateScrobblerElements()
  }, [currentTrack, isPlaying, currentTime, duration])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const container = document.getElementById('web-scrobbler-metadata')
      if (container) {
        container.remove()
      }

      // Clean up meta tags
      const metaNames = [
        'music:song',
        'music:musician', 
        'music:album',
        'music:duration',
        'og:title',
        'og:description',
        'og:type',
        'og:image'
      ]

      metaNames.forEach(name => {
        const meta = document.querySelector(`meta[name="${name}"]`)
        if (meta) {
          meta.remove()
        }
      })
    }
  }, [])

  // This component doesn't render anything visible
  return null
}
