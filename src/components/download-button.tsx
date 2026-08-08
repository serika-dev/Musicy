'use client'

import { Track } from '@/types/track'
import { useTrackDownload } from '@/hooks/useTrackDownload'
import { Button } from '@/components/ui/button'
import { Download, CheckCircle2, Loader2, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface DownloadButtonProps {
  track: Track | null
  className?: string
  showLabel?: boolean
}

export function DownloadButton({ track, className, showLabel = false }: DownloadButtonProps) {
  const { isDownloaded, isDownloading, download, remove, progress } = useTrackDownload(track)

  if (!track) return null

  if (isDownloading) {
    return (
      <Button
        variant="ghost"
        size="icon"
        disabled
        className={cn("text-purple-400 relative", className)}
      >
        <Loader2 className="h-5 w-5 animate-spin" />
        {progress > 0 && (
          <span className="absolute -bottom-1 text-[8px] font-bold">
            {progress}%
          </span>
        )}
      </Button>
    )
  }

  if (isDownloaded) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size={showLabel ? "default" : "icon"}
            className={cn("text-green-400 hover:text-green-300 hover:bg-green-500/10", className)}
          >
            <CheckCircle2 className="h-5 w-5" />
            {showLabel && <span className="ml-2">Downloaded</span>}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-black/90 border-white/10 backdrop-blur-xl">
          <DropdownMenuItem 
            onClick={remove}
            className="text-red-400 focus:text-red-300 focus:bg-red-500/10 cursor-pointer"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Remove download
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <Button
      variant="ghost"
      size={showLabel ? "default" : "icon"}
      onClick={() => download()}
      className={cn("text-white/60 hover:text-white hover:bg-white/10", className)}
    >
      <Download className="h-5 w-5" />
      {showLabel && <span className="ml-2">Download for offline</span>}
    </Button>
  )
}
