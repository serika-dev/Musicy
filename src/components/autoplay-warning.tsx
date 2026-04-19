'use client'

import { useMusicPlayer } from '@/contexts/music-player-context'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertCircle, MousePointer2, Smartphone } from 'lucide-react'
import { useEffect, useState } from 'react'

export function AutoplayWarning() {
  const { isAutoplayBlocked, remoteBlockedDevices, clearAutoplayBlock } = useMusicPlayer()
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (isAutoplayBlocked || remoteBlockedDevices.length > 0) {
      setShow(true)
    } else {
      setShow(false)
    }
  }, [isAutoplayBlocked, remoteBlockedDevices])

  if (!show) return null

  return (
    <Dialog open={show} onOpenChange={(open) => {
      // Don't allow closing if blocked on THIS device unless resolved
      if (!open && isAutoplayBlocked) return
      setShow(open)
    }}>
      <DialogContent className="sm:max-w-md bg-black/90 backdrop-blur-xl border-white/10 text-white shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-500/20 rounded-full">
              <AlertCircle className="h-6 w-6 text-red-500" />
            </div>
            <DialogTitle className="text-xl font-bold">Playback Interrupted</DialogTitle>
          </div>
        </DialogHeader>
        
        <div className="text-white/70 text-base">
          {isAutoplayBlocked ? (
            <div className="flex flex-col gap-4">
              <span>
                Your browser blocked autoplay on this device. Browsers require a click to allow audio.
              </span>
              <div className="p-4 bg-white/5 rounded-lg flex items-center gap-3">
                <MousePointer2 className="h-5 w-5 text-green-400" />
                <span className="font-medium text-white">Click the button below to start playing.</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <span>
                Autoplay is blocked on the following remote devices:
              </span>
              <div className="space-y-2">
                {remoteBlockedDevices.map((device) => (
                  <div key={device} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                    <Smartphone className="h-5 w-5 text-blue-400" />
                    <span className="font-bold">{device}</span>
                  </div>
                ))}
              </div>
              <span className="text-sm italic">
                Please interact with those devices directly to allow playback.
              </span>
            </div>
          )}
        </div>

        <div className="bg-white/5 rounded-lg p-3 text-xs text-white/50 border border-white/5 mt-4">
          <p className="font-bold text-white/70 mb-1 leading-tight">Pro Tip (Get rid of this):</p>
          To stop this popup forever, click the <span className="text-blue-400 font-bold">Lock icon</span> in the URL bar → <span className="text-white font-bold">Site Settings</span> → Set <span className="text-white font-bold">Autoplay</span> to "Allow".
        </div>

        {isAutoplayBlocked && (
          <div className="mt-6">
            <Button
              className="w-full h-12 bg-white text-black hover:bg-gray-200 font-bold text-lg rounded-full transition-transform hover:scale-[1.02] active:scale-[0.98]"
              onClick={clearAutoplayBlock}
            >
              Start Playing Now
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
