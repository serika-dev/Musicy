import { prisma } from '@/lib/db'
import { Metadata } from 'next'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const track = await prisma.track.findUnique({
    where: { id },
    include: { artist: true, album: true }
  })

  if (!track) return {}

  const title = `${track.title} by ${track.artist.name}`
  const image = track.album?.coverImageUrl || ""

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://musicy.app"

  return {
    title,
    description: `Listen to ${track.title} by ${track.artist.name} on Musicy. High-fidelity lossless streaming.`,
    openGraph: {
      title,
      description: `Listen to ${track.title} on Musicy.`,
      images: [image],
      type: 'music.song',
    },
    twitter: {
      card: 'player',
      title,
      description: `Listen to ${track.title} on Musicy.`,
      images: [image],
    },
    alternates: {
      types: {
        'application/json+oembed': `${appUrl}/api/oembed?url=${appUrl}/tracks/${id}`,
        'text/xml+oembed': `${appUrl}/api/oembed?url=${appUrl}/tracks/${id}&format=xml`,
      }
    },
    other: {
      'twitter:player': `${appUrl}/embed/tracks/${id}`,
      'twitter:player:width': '456',
      'twitter:player:height': '152',
    }
  }
}

export default function TrackLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
