'use client'

import { useArtistImage } from '@/hooks/useArtistImage'

interface ArtistImageProps {
  artistId?: string
  artistImageUrl?: string
  artistName: string
  className?: string
  fallbackClassName?: string
}

export function ArtistImage({ 
  artistId, 
  artistImageUrl, 
  artistName, 
  className = "w-full h-full object-cover",
  fallbackClassName = "w-full h-full flex items-center justify-center"
}: ArtistImageProps) {
  const { data: imageData } = useArtistImage(artistId, artistImageUrl)

  // Use profile picture if available
  if (imageData?.imageUrl) {
    return (
      <img
        src={imageData.imageUrl}
        alt={artistName}
        className={className}
        onError={(e) => {
          // Fallback to album cover if profile pic fails
          if (imageData.fallbackUrl) {
            e.currentTarget.src = imageData.fallbackUrl
          }
        }}
      />
    )
  }

  // Use album cover fallback
  if (imageData?.fallbackUrl) {
    return (
      <img
        src={imageData.fallbackUrl}
        alt={`${artistName} (from album)`}
        className={className}
        style={{ filter: 'brightness(0.8) saturate(1.2)' }} // Slightly different styling for album covers
      />
    )
  }

  // Final fallback to artist initial
  return (
    <div className={fallbackClassName}>
      <span className="text-white text-2xl font-bold">
        {artistName.charAt(0)}
      </span>
    </div>
  )
}
