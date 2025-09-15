import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

export function formatFileSize(bytes: bigint): string {
  const units = ['B', 'KB', 'MB', 'GB']
  let size = Number(bytes)
  let unitIndex = 0
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`
}

export function formatBitRate(bitRate?: number): string {
  if (!bitRate) return 'Unknown'
  if (bitRate >= 1000) {
    return `${(bitRate / 1000).toFixed(1)}k`
  }
  return `${bitRate}`
}
