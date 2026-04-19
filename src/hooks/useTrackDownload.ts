'use client'

import { useState, useEffect, useCallback } from 'react'
import { Track } from '@/types/track'
import { isTrackDownloaded, saveTrackOffline, removeOfflineTrack } from '@/lib/offline-storage'
import { toast } from 'sonner'

export function useTrackDownload(track: Track | null) {
  const [isDownloaded, setIsDownloaded] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [progress, setProgress] = useState(0)

  const checkStatus = useCallback(async () => {
    if (!track) return
    const status = await isTrackDownloaded(track.id)
    setIsDownloaded(status)
  }, [track])

  useEffect(() => {
    checkStatus()
  }, [checkStatus])

  const download = async () => {
    if (!track) return
    setIsDownloading(true)
    setProgress(10)

    try {
      // 1. Fetch the audio file
      const response = await fetch(track.filePath)
      if (!response.ok) throw new Error('Failed to fetch track audio')
      
      const reader = response.body?.getReader()
      const contentLength = +(response.headers.get('Content-Length') ?? 0)
      
      if (!reader) throw new Error('Could not read response body')

      let receivedLength = 0
      const chunks = []
      
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        chunks.push(value)
        receivedLength += value.length
        
        if (contentLength) {
          setProgress(Math.round((receivedLength / contentLength) * 90) + 10)
        }
      }

      const blob = new Blob(chunks)
      
      // 2. Save to IndexedDB
      await saveTrackOffline(track, blob)
      
      setIsDownloaded(true)
      toast.success(`Downloaded "${track.title}" for offline playback`)
    } catch (error) {
      console.error('Download error:', error)
      toast.error(`Failed to download "${track.title}"`)
    } finally {
      setIsDownloading(false)
      setProgress(0)
    }
  }

  const remove = async () => {
    if (!track) return
    try {
      await removeOfflineTrack(track.id)
      setIsDownloaded(false)
      toast.info(`Removed "${track.title}" from downloads`)
    } catch (error) {
      console.error('Remove error:', error)
      toast.error('Failed to remove track')
    }
  }

  return {
    isDownloaded,
    isDownloading,
    progress,
    download,
    remove,
    refreshStatus: checkStatus
  }
}
