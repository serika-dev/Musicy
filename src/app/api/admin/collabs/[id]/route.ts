import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

interface RouteContext {
  params: Promise<{ id: string }>
}

// GET: Fetch collab details with members, tracks, albums
export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const adminUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })
    if (!adminUser || adminUser.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const collab = await prisma.artist.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        bio: true,
        imageUrl: true,
        bannerUrl: true,
        website: true,
        verified: true,
        createdAt: true,
        _count: {
          select: {
            tracks: true,
            albums: true,
            followers: true,
          },
        },
        tracks: {
          select: {
            id: true,
            title: true,
            genre: true,
            isPublic: true,
            playCount: true,
            album: { select: { id: true, title: true } },
          },
          orderBy: { playCount: 'desc' },
        },
        albums: {
          select: {
            id: true,
            title: true,
            albumType: true,
            isPublic: true,
            coverImageUrl: true,
            releaseDate: true,
            _count: { select: { tracks: true } },
          },
          orderBy: { releaseDate: 'desc' },
        },
      },
    })

    if (!collab) {
      return NextResponse.json({ message: 'Collab not found' }, { status: 404 })
    }

    // Find member artists by splitting name
    const memberNames = collab.name.split(' & ').map(n => n.trim()).filter(Boolean)
    const members: { id: string; name: string; imageUrl: string | null; verified: boolean }[] = []
    for (const name of memberNames) {
      const found = await prisma.artist.findFirst({
        where: { name: { equals: name, mode: 'insensitive' } },
        select: { id: true, name: true, imageUrl: true, verified: true },
      })
      if (found) members.push(found)
    }

    return NextResponse.json({ ...collab, members })
  } catch (error) {
    console.error('Error fetching collab:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

// PATCH: Update collab metadata and/or members
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const adminUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })
    if (!adminUser || adminUser.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { bio, website, verified, imageUrl, bannerUrl, memberIds, syncFeatured } = body

    // Fetch current collab
    const collab = await prisma.artist.findUnique({
      where: { id },
      select: { id: true, name: true, tracks: { select: { id: true } }, albums: { select: { id: true } } },
    })

    if (!collab) {
      return NextResponse.json({ message: 'Collab not found' }, { status: 404 })
    }

    let newName = collab.name

    // If memberIds provided, rebuild name from member names
    if (memberIds && Array.isArray(memberIds)) {
      const memberArtists = await prisma.artist.findMany({
        where: { id: { in: memberIds } },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      })

      if (memberArtists.length < 2) {
        return NextResponse.json(
          { message: 'A collaboration needs at least 2 artists' },
          { status: 400 }
        )
      }

      newName = memberArtists.map(a => a.name).join(' & ')

      // Check name uniqueness (excluding self)
      const existing = await prisma.artist.findFirst({
        where: {
          name: { equals: newName, mode: 'insensitive' },
          id: { not: id },
        },
      })
      if (existing) {
        return NextResponse.json(
          { message: `Artist "${newName}" already exists` },
          { status: 409 }
        )
      }
    }

    // Update the collab artist
    const updated = await prisma.artist.update({
      where: { id },
      data: {
        name: newName,
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
        imageUrl: true,
        bannerUrl: true,
        website: true,
        verified: true,
      },
    })

    // If syncFeatured is true and memberIds provided, update featured artists
    // on all tracks/albums owned by the collab to include the member artists
    if (syncFeatured && memberIds && Array.isArray(memberIds)) {
      const trackIds = collab.tracks.map(t => t.id)
      const albumIds = collab.albums.map(a => a.id)

      // Set featured artists on all collab tracks to the member artists
      if (trackIds.length > 0) {
        await Promise.all(
          trackIds.map(trackId =>
            prisma.track.update({
              where: { id: trackId },
              data: {
                featuredArtists: {
                  set: memberIds.map(memberId => ({ id: memberId })),
                },
              },
            })
          )
        )
      }

      // Set featured artists on all collab albums to the member artists
      if (albumIds.length > 0) {
        await Promise.all(
          albumIds.map(albumId =>
            prisma.album.update({
              where: { id: albumId },
              data: {
                featuredArtists: {
                  set: memberIds.map(memberId => ({ id: memberId })),
                },
              },
            })
          )
        )
      }
    }

    // Fetch updated members
    const memberNames = newName.split(' & ').map(n => n.trim()).filter(Boolean)
    const members: { id: string; name: string; imageUrl: string | null; verified: boolean }[] = []
    for (const name of memberNames) {
      const found = await prisma.artist.findFirst({
        where: { name: { equals: name, mode: 'insensitive' } },
        select: { id: true, name: true, imageUrl: true, verified: true },
      })
      if (found) members.push(found)
    }

    return NextResponse.json({ ...updated, members })
  } catch (error) {
    console.error('Error updating collab:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
