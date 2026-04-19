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
      card: 'summary_large_image',
      title,
      description: `Listen to ${album.title} on Musicy.`,
      images: [image],
    },
    other: {
      'alternate': `${appUrl}/api/oembed?url=${appUrl}/albums/${id}`
    }
  }
}

export default function AlbumLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
