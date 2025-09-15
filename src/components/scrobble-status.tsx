"use client"

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { ExternalLink, Music } from 'lucide-react'

interface ScrobbleStatusProps {
  className?: string
}

export function ScrobbleStatus({ className }: ScrobbleStatusProps) {
  const [isWebScrobblerDetected, setIsWebScrobblerDetected] = useState(false)
  const [connectorReady, setConnectorReady] = useState(false)

  useEffect(() => {
    // Check if Web Scrobbler is installed
    const checkWebScrobbler = () => {
      // Web Scrobbler typically injects a content script
      const hasWebScrobbler = !!(
        document.querySelector('[data-ext-name="web-scrobbler"]') ||
        document.querySelector('#web-scrobbler-root') ||
        window.chrome?.runtime?.getManifest?.()?.name?.includes('Web Scrobbler') ||
        // Check for common Web Scrobbler elements
        document.querySelector('meta[name="web-scrobbler"]')
      )
      
      setIsWebScrobblerDetected(hasWebScrobbler)
    }

    // Listen for our connector ready event
    const handleConnectorReady = () => {
      setConnectorReady(true)
      console.log('🎵 Web Scrobbler connector is ready!')
    }

    // Check immediately and after a delay
    checkWebScrobbler()
    setTimeout(checkWebScrobbler, 2000)
    setTimeout(checkWebScrobbler, 5000)

    // Listen for connector ready event
    window.addEventListener('musicy-scrobbler-ready', handleConnectorReady)

    return () => {
      window.removeEventListener('musicy-scrobbler-ready', handleConnectorReady)
    }
  }, [])

  // Don't show anything if neither Web Scrobbler nor our connector is detected
  if (!connectorReady && !isWebScrobblerDetected) {
    return null
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {connectorReady && (
        <Badge variant="secondary" className="text-xs flex items-center gap-1">
          <Music className="w-3 h-3" />
          Scrobbler Ready
        </Badge>
      )}
      
      {isWebScrobblerDetected && (
        <Badge variant="outline" className="text-xs flex items-center gap-1">
          <ExternalLink className="w-3 h-3" />
          Web Scrobbler
        </Badge>
      )}

      {connectorReady && !isWebScrobblerDetected && (
        <div className="text-xs text-muted-foreground">
          Install{' '}
          <a 
            href="https://web-scrobbler.com/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Web Scrobbler
          </a>
          {' '}to scrobble to Last.fm
        </div>
      )}
    </div>
  )
}
