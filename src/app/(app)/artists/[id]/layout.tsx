import { prisma } from '@/lib/db'
import { Metadata } from 'next'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const artist = await prisma.artist.findUnique({
    where: { id }
  })

  if (!artist) return {}

  const title = artist.name
  const image = artist.imageUrl || ""

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://musicy.app"

  return {
    title,
    description: `Explore ${artist.name} on Musicy. High-fidelity lossless music platform.`,
    openGraph: {
      title,
      description: `Explore ${artist.name} on Musicy.`,
      images: [image],
      type: 'profile',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: `Explore ${artist.name} on Musicy.`,
      images: [image],
    },
    other: {
      'alternate': `${appUrl}/api/oembed?url=${appUrl}/artists/${id}`
    }
  }
}

export default function ArtistLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
