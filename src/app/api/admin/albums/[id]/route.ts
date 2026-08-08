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

    const adminUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (!adminUser || adminUser.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const { id } = await params
    const { title, description, coverImageUrl, genre, isPublic, albumType, releaseDate, artistId } = await request.json()

    // If changing artist, check unique constraint [title, artistId]
    if (artistId) {
      const existing = await prisma.album.findFirst({
        where: {
          title: { equals: title || '', mode: 'insensitive' },
          artistId,
          id: { not: id },
        },
      })
      if (existing) {
        return NextResponse.json({ message: 'An album with this title already exists for that artist' }, { status: 409 })
      }
    }

    const updateData: any = {
      ...(title !== undefined && { title: title?.trim() || undefined }),
      ...(description !== undefined && { description: description || null }),
      ...(coverImageUrl !== undefined && { coverImageUrl: coverImageUrl || null }),
      ...(genre !== undefined && { genre: genre || null }),
      ...(typeof isPublic === 'boolean' && { isPublic }),
      ...(albumType && { albumType }),
      ...(artistId !== undefined && { artistId: artistId || undefined }),
    }

    // Handle releaseDate - allow null to unset
    if (releaseDate !== undefined) {
      updateData.releaseDate = releaseDate ? new Date(releaseDate) : null
    }

    const updatedAlbum = await prisma.album.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(updatedAlbum)
  } catch (error) {
    console.error('Error updating album:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const adminUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (!adminUser || adminUser.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const { id } = await params

    const album = await prisma.album.findUnique({
      where: { id },
      select: { id: true, title: true }
    })

    if (!album) {
      return NextResponse.json({ message: 'Album not found' }, { status: 404 })
    }

    await prisma.album.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Album deleted successfully' })
  } catch (error) {
    console.error('Error deleting album:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
