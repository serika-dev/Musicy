import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { validateApiKey } from "@/lib/api-utils"

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions)
    
    const apiKeyUser = await validateApiKey(request)
    // Allow public access for basic metadata (needed for Embeds)

    const { id } = await params

    const artist = await prisma.artist.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        altNames: true,
        bio: true,
        imageUrl: true,
        website: true,
        verified: true,
        isCollab: true,
        createdAt: true,
        _count: {
          select: {
            tracks: { where: { isPublic: true } },
            albums: { where: { isPublic: true } },
            followers: true,
          },
        },
        tracks: {
          where: { isPublic: true },
          select: {
            id: true,
            title: true,
            duration: true,
            coverImageUrl: true,
            genre: true,
            format: true,
            filePath: true,
            bitRate: true,
            sampleRate: true,
            playCount: true,
            artist: {
              select: {
                id: true,
                name: true,
                verified: true,
              },
            },
            album: {
              select: {
                id: true,
                title: true,
                coverImageUrl: true,
              },
            },
          },
          orderBy: [
            { playCount: 'desc' },
            { createdAt: 'desc' },
          ],
          take: 5, // Top 5 tracks for profile preview
        },
        albums: {
          where: { isPublic: true },
          select: {
            id: true,
            title: true,
            coverImageUrl: true,
            releaseDate: true,
            albumType: true,
            _count: {
              select: {
                tracks: { where: { isPublic: true } },
              },
            },
          },
          orderBy: {
            releaseDate: 'desc',
          },
        },
        // Tracks where this artist is featured (e.g. collaborative tracks)
        featuredInTracks: {
          where: { isPublic: true },
          select: {
            id: true,
            title: true,
            duration: true,
            coverImageUrl: true,
            genre: true,
            format: true,
            filePath: true,
            bitRate: true,
            sampleRate: true,
            playCount: true,
            artist: {
              select: {
                id: true,
                name: true,
                verified: true,
              },
            },
            album: {
              select: {
                id: true,
                title: true,
                coverImageUrl: true,
              },
            },
          },
          orderBy: [
            { playCount: 'desc' },
            { createdAt: 'desc' },
          ],
          take: 5, // Top 5 featured tracks for profile preview
        },
        // Albums where this artist is featured
        featuredInAlbums: {
          where: { isPublic: true },
          select: {
            id: true,
            title: true,
            coverImageUrl: true,
            releaseDate: true,
            albumType: true,
            artist: {
              select: {
                id: true,
                name: true,
              },
            },
            _count: {
              select: {
                tracks: { where: { isPublic: true } },
              },
            },
          },
          orderBy: {
            releaseDate: 'desc',
          },
        },
      },
    })

    if (!artist) {
      return NextResponse.json(
        { message: "Artist not found" },
        { status: 404 }
      )
    }

    const isCollab = artist.isCollab === true || (artist.isCollab === null && artist.name.includes(' & '))

    // For collaborative artists, find the individual artists
    let collaborationArtists: { id: string; name: string; imageUrl: string | null; verified: boolean }[] = []
    if (isCollab) {
      const individualNames = artist.name.split(' & ').map(n => n.trim()).filter(Boolean)
      for (const name of individualNames) {
        const found = await prisma.artist.findFirst({
          where: { name: { equals: name, mode: 'insensitive' } },
          select: { id: true, name: true, imageUrl: true, verified: true },
        })
        if (found) collaborationArtists.push(found)
      }
    }

    // For individual artists, find collaborations (collab artists whose name includes this artist's name)
    let collaborations: { id: string; name: string; imageUrl: string | null; bio: string | null }[] = []
    if (!isCollab) {
      const collabArtists = await prisma.artist.findMany({
        where: {
          OR: [
            { isCollab: true, name: { startsWith: `${artist.name} & `, mode: 'insensitive' } },
            { isCollab: true, name: { contains: ` & ${artist.name}`, mode: 'insensitive' } },
            { isCollab: null, name: { contains: ' & ', mode: 'insensitive' }, OR: [
              { name: { startsWith: `${artist.name} & `, mode: 'insensitive' } },
              { name: { contains: ` & ${artist.name}`, mode: 'insensitive' } },
            ] },
          ],
        },
        select: { id: true, name: true, imageUrl: true, bio: true },
      })
      collaborations = collabArtists
    }

    // Attach follow state
    let isFollowing = false
    if (session?.user?.id) {
      const follow = await prisma.artistFollow.findUnique({
        where: {
          userId_artistId: {
            userId: session.user.id,
            artistId: id,
          },
        },
        select: { userId: true },
      })
      isFollowing = !!follow
    }

    const isAuthorized = session || apiKeyUser;
    
    // Mask file paths for unauthorized access
    const maskTracks = (tracks: any[]) =>
      tracks.map((track: any) => ({
        ...track,
        filePath: isAuthorized ? track.filePath : undefined,
      }))

    // Limit albums to top 5 for profile preview
    const limitedAlbums = (artist as any).albums?.slice(0, 5) || []

    const returnedArtist = {
      ...artist,
      tracks: maskTracks((artist as any).tracks),
      albums: limitedAlbums,
      featuredInTracks: maskTracks((artist as any).featuredInTracks || []),
      collaborationArtists,
      collaborations,
      isCollab,
    }

    return NextResponse.json({ ...returnedArtist, isFollowing })
  } catch (error) {
    console.error("Error fetching artist:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}
