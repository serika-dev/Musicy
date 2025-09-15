import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { uploadFileToR2, generateAudioFileKey } from '@/lib/r2-client'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const formData = await request.formData()
    const audioFile = formData.get('audioFile') as File | null
    const coverImage = formData.get('coverImage') as File | null

    // Required fields
    const title = formData.get('title') as string
    const artistName = formData.get('artistName') as string
    const albumTitle = formData.get('albumTitle') as string
    
    // Optional metadata fields
    const trackNumber = formData.get('trackNumber') as string
    const year = formData.get('year') as string
    const genre = formData.get('genre') as string
    const duration = formData.get('duration') as string
    const bitRate = formData.get('bitRate') as string
    const sampleRate = formData.get('sampleRate') as string
    const format = formData.get('format') as string
    const isPublic = formData.get('isPublic') === 'true'
    const albumDescription = formData.get('albumDescription') as string
    const albumType = (formData.get('albumType') as string) || 'ALBUM'
    const artistBio = formData.get('artistBio') as string
    const artistWebsite = formData.get('artistWebsite') as string
    const isVerified = formData.get('isVerified') === 'true'
    
    // LRCLib integration fields
    const lrcId = formData.get('lrcId') as string
    const plainLyrics = formData.get('plainLyrics') as string
    const syncedLyrics = formData.get('syncedLyrics') as string

    if (!audioFile || !title || !artistName) {
      return NextResponse.json(
        { message: 'Audio file, title, and artist name are required' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedAudioTypes = ['audio/flac', 'audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/alac', 'audio/x-flac']
    if (!allowedAudioTypes.includes(audioFile.type)) {
      return NextResponse.json(
        { message: 'Only FLAC, WAV, MP3, and ALAC audio files are supported' },
        { status: 400 }
      )
    }

    // Validate file size (max 100MB)
    if (audioFile.size > 100 * 1024 * 1024) {
      return NextResponse.json(
        { message: 'Audio file size must be less than 100MB' },
        { status: 400 }
      )
    }

    // Create or find artist
    let artist = await prisma.artist.findFirst({
      where: { name: artistName }
    })

    if (!artist) {
      artist = await prisma.artist.create({
        data: {
          name: artistName,
          bio: artistBio || null,
          website: artistWebsite || null,
          verified: isVerified || false,
        }
      })
    }

    // Create or find album if provided
    let album = null
    if (albumTitle) {
      album = await prisma.album.findFirst({
        where: {
          title: albumTitle,
          artistId: artist.id
        }
      })

      if (!album) {
        album = await prisma.album.create({
          data: {
            title: albumTitle,
            description: albumDescription || null,
            artistId: artist.id,
            releaseDate: year ? new Date(parseInt(year), 0, 1) : null,
            genre: genre || null,
            albumType: albumType as any,
            isPublic: isPublic,
          }
        })
      }
    }

    // We'll upload the audio file after creating the track record to use the track ID

    // Handle cover image upload if provided
    let coverImageUrl = null
    if (coverImage) {
      const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp']
      if (allowedImageTypes.includes(coverImage.type)) {
        const imageBytes = await coverImage.arrayBuffer()
        const imageBuffer = Buffer.from(imageBytes)
        const imageExtension = coverImage.name.split('.').pop() || 'jpg'
        const imageKey = `covers/albums/${artist.name}_${albumTitle || title}_${Date.now()}.${imageExtension}`.replace(/[^a-zA-Z0-9-_.]/g, '_')
        
        coverImageUrl = await uploadFileToR2(
          imageKey,
          imageBuffer,
          coverImage.type
        )

        // Update album with cover if album exists
        if (album) {
          await prisma.album.update({
            where: { id: album.id },
            data: { coverImageUrl }
          })
        }
      }
    }

    // Create track record with temporary path first
    const track = await prisma.track.create({
      data: {
        title,
        duration: duration ? parseInt(duration) : 0,
        filePath: 'temp-uploading', // Temporary path
        fileSize: BigInt(audioFile.size),
        bitRate: bitRate ? parseInt(bitRate) : null,
        sampleRate: sampleRate ? parseInt(sampleRate) : null,
        format: format || audioFile.name.split('.').pop()?.toUpperCase() || 'FLAC',
        trackNumber: trackNumber ? parseInt(trackNumber) : null,
        year: year ? parseInt(year) : null,
        genre: genre || null,
        isPublic: isPublic,
        artistId: artist.id,
        albumId: album?.id || null,
        
        // Lyrics data
        lrcId: lrcId ? parseInt(lrcId) : null,
        plainLyrics: plainLyrics || null,
        syncedLyrics: syncedLyrics || null,
      },
      include: {
        artist: {
          select: {
            id: true,
            name: true,
            verified: true,
          }
        },
        album: {
          select: {
            id: true,
            title: true,
            coverImageUrl: true,
          }
        }
      }
    })

    // Now upload audio file using the actual track ID
    const audioBytes = await audioFile.arrayBuffer()
    const audioBuffer = Buffer.from(audioBytes)
    const audioFileExtension = audioFile.name.split('.').pop() || 'flac'
    const audioKey = generateAudioFileKey(artist.id, track.id, audioFileExtension)
    
    const audioUrl = await uploadFileToR2(
      audioKey,
      audioBuffer,
      audioFile.type
    )

    // Update track with real R2 URL
    const updatedTrack = await prisma.track.update({
      where: { id: track.id },
      data: { filePath: audioUrl },
      include: {
        artist: {
          select: {
            id: true,
            name: true,
            verified: true,
          }
        },
        album: {
          select: {
            id: true,
            title: true,
            coverImageUrl: true,
          }
        }
      }
    })

    return NextResponse.json({
      message: 'Track uploaded successfully',
      track: updatedTrack,
      audioUrl,
      coverImageUrl,
    })

  } catch (error) {
    console.error('Error uploading track:', error)
    return NextResponse.json(
      { message: 'Internal server error', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
