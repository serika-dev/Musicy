import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: false, // Never expose email in public profile
        username: true,
        displayName: true,
        avatarUrl: true,
        isPremium: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            playlists: {
              where: {
                isPublic: true // Only count public playlists
              }
            },
            likedTracks: true,
            // Remove tracks count - users don't directly own tracks, tracks belong to artists
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    // For the current user's own profile, include email
    const { searchParams } = new URL(request.url)
    const includePrivate = searchParams.get('includePrivate') === 'true'
    
    if (includePrivate) {
      // This would require session validation in a real app
      const fullUser = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true, // Include email for own profile
          username: true,
          displayName: true,
          avatarUrl: true,
          isPremium: true,
          role: true,
          createdAt: true,
          _count: {
            select: {
              playlists: true, // Include all playlists
              likedTracks: true,
              // Remove tracks count - users don't directly own tracks, tracks belong to artists
            }
          }
        }
      })
      return NextResponse.json(fullUser)
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error fetching user profile:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
