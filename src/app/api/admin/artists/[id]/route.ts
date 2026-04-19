import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const adminUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (!adminUser || adminUser.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const { id } = await params
    const { name, bio, website, verified, imageUrl, bannerUrl } = await request.json()

    // Validate required fields
    if (!name || name.trim() === '') {
      return NextResponse.json({ message: 'Artist name is required' }, { status: 400 })
    }

    // Check if another artist with the same name exists
    const existingArtist = await prisma.artist.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive'
        },
        id: { not: id }
      }
    })

    if (existingArtist) {
      return NextResponse.json({ 
        message: 'Another artist with this name already exists' 
      }, { status: 409 })
    }

    const updatedArtist = await prisma.artist.update({
      where: { id },
      data: {
        name: name.trim(),
        ...(bio !== undefined && { bio: bio || null }),
        ...(website !== undefined && { website: website || null }),
        ...(typeof verified === 'boolean' && { verified }),
        ...(imageUrl !== undefined && { imageUrl: imageUrl || null }),
        ...(bannerUrl !== undefined && { bannerUrl: bannerUrl || null }),
      },
      select: {
        id: true,
        name: true,
        bio: true,
        website: true,
        verified: true,
        imageUrl: true,
        bannerUrl: true,
      },
    })

    return NextResponse.json(updatedArtist)
  } catch (error) {
    console.error('Error updating artist:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const adminUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (!adminUser || adminUser.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const { id } = await params

    // Check if artist exists
    const artist = await prisma.artist.findUnique({
      where: { id },
      select: { 
        id: true, 
        name: true,
        _count: {
          select: {
            tracks: true,
            albums: true,
          }
        }
      }
    })

    if (!artist) {
      return NextResponse.json({ message: 'Artist not found' }, { status: 404 })
    }

    // Delete artist (cascade will handle related tracks, albums, etc.)
    await prisma.artist.delete({
      where: { id },
    })

    return NextResponse.json({ 
      message: 'Artist deleted successfully',
      deletedTracks: artist._count.tracks,
      deletedAlbums: artist._count.albums,
    })
  } catch (error) {
    console.error('Error deleting artist:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
