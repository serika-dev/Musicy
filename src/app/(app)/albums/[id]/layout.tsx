import { prisma } from '@/lib/db'
import { Metadata } from 'next'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const album = await prisma.album.findUnique({
    where: { id },
    include: { artist: true }
  })

  if (!album) return {}

  const title = `${album.title} by ${album.artist.name}`
  const image = album.coverImageUrl || ""

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://musicy.app"

  return {
    title,
    description: `Listen to ${album.title} by ${album.artist.name} on Musicy.`,
    openGraph: {
      title,
      description: `Listen to ${album.title} on Musicy.`,
      images: [image],
      type: 'music.album',
    },
    twitter: {
      card: 'player',
      title,
      description: `Listen to ${album.title} on Musicy.`,
      images: [image],
    },
    alternates: {
      types: {
        'application/json+oembed': `${appUrl}/api/oembed?url=${encodeURIComponent(`${appUrl}/albums/${id}`)}`,
        'text/xml+oembed': `${appUrl}/api/oembed?url=${encodeURIComponent(`${appUrl}/albums/${id}`)}&format=xml`,
      }
    },
    other: {
      'twitter:player': `${appUrl}/embed/albums/${id}`,
      'twitter:player:width': '456',
      'twitter:player:height': '152',
    }
  }
}

export default function AlbumLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
