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
    const { isPublic, title, genre, year, trackNumber, artistId, albumId, coverImageUrl } = await request.json()

    // If changing artist, check unique constraint [title, artistId]
    if (artistId) {
      const existing = await prisma.track.findFirst({
        where: {
          title: { equals: title || '', mode: 'insensitive' },
          artistId,
          id: { not: id },
        },
      })
      if (existing) {
        return NextResponse.json({ message: 'A track with this title already exists for that artist' }, { status: 409 })
      }
    }

    const updateData: any = {
      ...(typeof isPublic === 'boolean' && { isPublic }),
      ...(title !== undefined && { title: title?.trim() || undefined }),
      ...(genre !== undefined && { genre: genre || null }),
      ...(year !== undefined && { year: year ? parseInt(String(year)) : null }),
      ...(trackNumber !== undefined && { trackNumber: trackNumber ? parseInt(String(trackNumber)) : null }),
      ...(artistId !== undefined && { artistId: artistId || undefined }),
      ...(coverImageUrl !== undefined && { coverImageUrl: coverImageUrl || null }),
    }

    // Handle albumId separately - allow null to unset album
    if (albumId !== undefined) {
      updateData.albumId = albumId || null
    }

    const updatedTrack = await prisma.track.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        title: true,
        isPublic: true,
        genre: true,
        year: true,
        trackNumber: true,
        artistId: true,
        albumId: true,
        coverImageUrl: true,
      },
    })

    return NextResponse.json(updatedTrack)
  } catch (error) {
    console.error('Error updating track:', error)
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

    // Check if track exists
    const track = await prisma.track.findUnique({
      where: { id },
      select: { id: true, title: true, filePath: true }
    })

    if (!track) {
      return NextResponse.json({ message: 'Track not found' }, { status: 404 })
    }

    // Delete track (cascade will handle related records)
    await prisma.track.delete({
      where: { id },
    })

    // TODO: Also delete the actual audio file from R2 storage
    // You can use the deleteFileFromR2 function here

    return NextResponse.json({ message: 'Track deleted successfully' })
  } catch (error) {
    console.error('Error deleting track:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
