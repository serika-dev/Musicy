import { prisma } from '@/lib/db'
import { Metadata } from 'next'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const playlist = await prisma.playlist.findUnique({
    where: { id },
    include: { owner: true }
  })

  if (!playlist) return {}

  const title = `${playlist.name} by ${playlist.owner.displayName || playlist.owner.username}`
  const image = playlist.coverImageUrl || ""

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://musicy.app"

  return {
    title,
    description: `Listen to ${playlist.name} on Musicy. Curated high-fidelity audio.`,
    openGraph: {
      title,
      description: `Listen to ${playlist.name} on Musicy.`,
      images: [image],
      type: 'music.playlist',
    },
    twitter: {
      card: 'player',
      title,
      description: `Listen to ${playlist.name} on Musicy.`,
      images: [image],
    },
    alternates: {
      types: {
        'application/json+oembed': `${appUrl}/api/oembed?url=${appUrl}/playlists/${id}`,
        'text/xml+oembed': `${appUrl}/api/oembed?url=${appUrl}/playlists/${id}&format=xml`,
      }
    },
    other: {
      'twitter:player': `${appUrl}/embed/playlists/${id}`,
      'twitter:player:width': '456',
      'twitter:player:height': '152',
    }
  }
}

export default function PlaylistLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
