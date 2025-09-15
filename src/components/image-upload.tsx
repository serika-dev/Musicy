"use client"

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Upload, X, Camera, Music } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ImageUploadProps {
  currentImage?: string | null
  onImageChange: (imageUrl: string) => void
  type: 'profile' | 'playlist'
  entityId?: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
}

export function ImageUpload({
  currentImage,
  onImageChange,
  type,
  entityId,
  className,
  size = 'md',
  disabled = false
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImage || null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-32 h-32',
    lg: 'w-48 h-48'
  }

  const handleFileSelect = () => {
    if (disabled) return
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB')
      return
    }

    setIsUploading(true)

    try {
      // Create preview
      const reader = new FileReader()
      reader.onload = () => {
        setPreviewUrl(reader.result as string)
      }
      reader.readAsDataURL(file)

      // Upload file
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', type)
      if (entityId) {
        formData.append('entityId', entityId)
      }

      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Upload failed')
      }

      const result = await response.json()
      onImageChange(result.url)
      setPreviewUrl(result.url)

    } catch (error) {
      console.error('Upload error:', error)
      alert('Failed to upload image. Please try again.')
      setPreviewUrl(currentImage || null)
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemoveImage = () => {
    if (disabled) return
    setPreviewUrl(null)
    onImageChange('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const isCircular = type === 'profile'

  return (
    <div className={cn('flex flex-col items-center space-y-4', className)}>
      <Card className={cn(
        'relative overflow-hidden cursor-pointer hover:opacity-80 transition-opacity',
        sizeClasses[size],
        isCircular ? 'rounded-full' : 'rounded-lg',
        disabled && 'opacity-50 cursor-not-allowed'
      )}>
        <CardContent className="p-0 h-full">
          {previewUrl ? (
            <>
              <img
                src={previewUrl}
                alt={`${type} image`}
                className={cn(
                  'w-full h-full object-cover',
                  isCircular ? 'rounded-full' : 'rounded-lg'
                )}
              />
              {!disabled && (
                <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={handleFileSelect}
                      disabled={isUploading}
                    >
                      <Camera className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={handleRemoveImage}
                      disabled={isUploading}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div
              className={cn(
                'w-full h-full bg-muted flex items-center justify-center border-2 border-dashed border-muted-foreground/30',
                isCircular ? 'rounded-full' : 'rounded-lg',
                !disabled && 'hover:border-muted-foreground/50 hover:bg-muted/80'
              )}
              onClick={handleFileSelect}
            >
              {isUploading ? (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              ) : (
                <div className="flex flex-col items-center space-y-2 text-muted-foreground">
                  {type === 'profile' ? (
                    <Camera className="w-8 h-8" />
                  ) : (
                    <Music className="w-8 h-8" />
                  )}
                  {size !== 'sm' && (
                    <span className="text-xs text-center">
                      Upload {type === 'profile' ? 'Photo' : 'Cover'}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload button for smaller sizes */}
      {size === 'sm' && !previewUrl && !disabled && (
        <Button
          size="sm"
          variant="outline"
          onClick={handleFileSelect}
          disabled={isUploading}
        >
          <Upload className="w-4 h-4 mr-2" />
          Upload
        </Button>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled || isUploading}
      />

      {/* Upload instructions */}
      {size === 'lg' && (
        <div className="text-center text-sm text-muted-foreground max-w-xs">
          <p>JPG, PNG, GIF up to 5MB</p>
          <p>Recommended: {type === 'profile' ? '400x400px' : '640x640px'}</p>
        </div>
      )}
    </div>
  )
}
