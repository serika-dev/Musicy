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
    const { isPublic, title, genre, year } = await request.json()

    const updatedTrack = await prisma.track.update({
      where: { id },
      data: {
        ...(typeof isPublic === 'boolean' && { isPublic }),
        ...(title && { title }),
        ...(genre && { genre }),
        ...(year && { year: parseInt(year) }),
      },
      select: {
        id: true,
        title: true,
        isPublic: true,
        genre: true,
        year: true,
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
