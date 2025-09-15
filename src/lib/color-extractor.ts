/**
 * Extract dominant colors from an image URL for gradient generation
 */

interface ColorPalette {
  primary: string
  secondary: string
  accent: string
  isDark: boolean
}

export async function extractColorsFromImage(imageUrl: string): Promise<ColorPalette> {
  try {
    // Create a canvas element to analyze the image
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Could not get canvas context')
    }

    // Load the image
    const img = new Image()
    img.crossOrigin = 'anonymous'
    
    return new Promise((resolve, reject) => {
      img.onload = () => {
        try {
          // Set canvas size to a small version of the image for performance
          const size = 50
          canvas.width = size
          canvas.height = size
          
          // Draw the image
          ctx.drawImage(img, 0, 0, size, size)
          
          // Get image data
          const imageData = ctx.getImageData(0, 0, size, size)
          const data = imageData.data
          
          // Analyze colors
          const colors: { [key: string]: number } = {}
          let totalBrightness = 0
          let pixelCount = 0
          
          // Sample pixels and count color frequencies - sample more pixels for better results
          for (let i = 0; i < data.length; i += 8) { // Sample every 2nd pixel for better color detection
            const r = data[i]
            const g = data[i + 1]
            const b = data[i + 2]
            const a = data[i + 3]
            
            if (a > 128) { // Skip transparent pixels
              // Skip very light and very dark pixels for more interesting colors
              const brightness = (r + g + b) / 3
              if (brightness > 20 && brightness < 235) {
                totalBrightness += brightness
                pixelCount++
                
                // Use less aggressive quantization for more color variety
                const quantizedR = Math.floor(r / 24) * 24
                const quantizedG = Math.floor(g / 24) * 24
                const quantizedB = Math.floor(b / 24) * 24
                
                const colorKey = `${quantizedR},${quantizedG},${quantizedB}`
                colors[colorKey] = (colors[colorKey] || 0) + 1
              }
            }
          }
          
          // Find the most common colors
          const sortedColors = Object.entries(colors)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([color]) => color.split(',').map(Number))
          
          // Determine if the image is dark
          const avgBrightness = totalBrightness / pixelCount
          const isDark = avgBrightness < 128
          
          // Generate color palette
          let primary = sortedColors[0] || [150, 150, 150]
          let secondary = sortedColors[1] || [100, 100, 100]
          let accent = sortedColors[2] || [200, 200, 200]
          
          // Enhance colors for better visual appeal
          if (isDark) {
            // For dark images, boost saturation and brightness
            primary = enhanceColor(primary, 1.3, 1.2)
            secondary = enhanceColor(secondary, 1.2, 1.1)
            accent = enhanceColor(accent, 1.1, 1.3)
          } else {
            // For light images, deepen colors
            primary = enhanceColor(primary, 1.1, 0.8)
            secondary = enhanceColor(secondary, 1.2, 0.7)
            accent = enhanceColor(accent, 1.0, 0.9)
          }
          
          resolve({
            primary: `rgb(${primary.join(', ')})`,
            secondary: `rgb(${secondary.join(', ')})`,
            accent: `rgb(${accent.join(', ')})`,
            isDark
          })
        } catch (error) {
          reject(error)
        }
      }
      
      img.onerror = () => {
        reject(new Error('Failed to load image'))
      }
      
      img.src = imageUrl
    })
  } catch (error) {
    console.warn('Color extraction failed:', error)
    // Return random vibrant gradient colors
    const vibrantColors = [
      ['rgb(239, 68, 68)', 'rgb(245, 101, 101)', 'rgb(251, 146, 60)'], // red-orange
      ['rgb(168, 85, 247)', 'rgb(236, 72, 153)', 'rgb(251, 146, 60)'], // purple-pink
      ['rgb(59, 130, 246)', 'rgb(147, 51, 234)', 'rgb(219, 39, 119)'], // blue-purple
      ['rgb(16, 185, 129)', 'rgb(52, 211, 153)', 'rgb(34, 197, 94)'], // green-teal
      ['rgb(245, 158, 11)', 'rgb(251, 191, 36)', 'rgb(252, 211, 77)'], // yellow-amber
      ['rgb(236, 72, 153)', 'rgb(219, 39, 119)', 'rgb(190, 18, 60)'], // pink-rose
      ['rgb(99, 102, 241)', 'rgb(129, 140, 248)', 'rgb(165, 180, 252)'], // indigo-blue
      ['rgb(14, 165, 233)', 'rgb(56, 189, 248)', 'rgb(125, 211, 252)'], // sky-cyan
    ]
    
    const randomPalette = vibrantColors[Math.floor(Math.random() * vibrantColors.length)]
    return {
      primary: randomPalette[0],
      secondary: randomPalette[1],
      accent: randomPalette[2],
      isDark: true
    }
  }
}

function enhanceColor(rgb: number[], saturationMultiplier: number, brightnessMultiplier: number): number[] {
  const [r, g, b] = rgb
  
  // Convert to HSL for easier manipulation
  const max = Math.max(r, g, b) / 255
  const min = Math.min(r, g, b) / 255
  const delta = max - min
  
  let h = 0
  let s = 0
  const l = (max + min) / 2
  
  if (delta !== 0) {
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min)
    
    switch (max) {
      case r / 255:
        h = ((g - b) / 255 / delta + (g < b ? 6 : 0)) / 6
        break
      case g / 255:
        h = ((b - r) / 255 / delta + 2) / 6
        break
      case b / 255:
        h = ((r - g) / 255 / delta + 4) / 6
        break
    }
  }
  
  // Apply enhancements
  const newS = Math.min(1, s * saturationMultiplier)
  const newL = Math.max(0, Math.min(1, l * brightnessMultiplier))
  
  // Convert back to RGB
  const c = (1 - Math.abs(2 * newL - 1)) * newS
  const x = c * (1 - Math.abs(((h * 6) % 2) - 1))
  const m = newL - c / 2
  
  let rPrime = 0, gPrime = 0, bPrime = 0
  
  if (h >= 0 && h < 1/6) {
    rPrime = c; gPrime = x; bPrime = 0
  } else if (h >= 1/6 && h < 2/6) {
    rPrime = x; gPrime = c; bPrime = 0
  } else if (h >= 2/6 && h < 3/6) {
    rPrime = 0; gPrime = c; bPrime = x
  } else if (h >= 3/6 && h < 4/6) {
    rPrime = 0; gPrime = x; bPrime = c
  } else if (h >= 4/6 && h < 5/6) {
    rPrime = x; gPrime = 0; bPrime = c
  } else {
    rPrime = c; gPrime = 0; bPrime = x
  }
  
  return [
    Math.round((rPrime + m) * 255),
    Math.round((gPrime + m) * 255),
    Math.round((bPrime + m) * 255)
  ]
}

// Generate CSS gradient from color palette
export function generateGradientFromPalette(palette: ColorPalette): string {
  return `linear-gradient(135deg, ${palette.primary} 0%, ${palette.secondary} 50%, ${palette.accent} 100%)`
}

// Default gradients for common music genres
export const genreGradients: { [key: string]: string } = {
  'Electronic': 'linear-gradient(135deg, rgb(59, 130, 246) 0%, rgb(147, 51, 234) 50%, rgb(219, 39, 119) 100%)',
  'J-Pop': 'linear-gradient(135deg, rgb(236, 72, 153) 0%, rgb(168, 85, 247) 50%, rgb(59, 130, 246) 100%)',
  'Rock': 'linear-gradient(135deg, rgb(239, 68, 68) 0%, rgb(245, 101, 101) 50%, rgb(251, 146, 60) 100%)',
  'Pop': 'linear-gradient(135deg, rgb(168, 85, 247) 0%, rgb(236, 72, 153) 50%, rgb(251, 146, 60) 100%)',
  'Alternative': 'linear-gradient(135deg, rgb(75, 85, 99) 0%, rgb(107, 114, 128) 50%, rgb(156, 163, 175) 100%)',
  'default': 'linear-gradient(135deg, rgb(239, 68, 68) 0%, rgb(168, 85, 247) 50%, rgb(59, 130, 246) 100%)'
}
