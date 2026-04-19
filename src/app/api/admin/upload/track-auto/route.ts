import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { uploadFileToR2, uploadFileToR2Direct, uploadLargeFileToR2, generateAudioFileKey } from '@/lib/r2-client'
import * as musicMetadata from 'music-metadata'

// Configure Next.js for large file uploads
export const maxDuration = 300 // 5 minutes timeout
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs' // Use Node.js runtime for better performance

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
    const extractMetadata = formData.get('extractMetadata') === 'true' // New option
    
    // Optional override fields (will override extracted metadata if provided)
    const titleOverride = formData.get('title') as string
    const artistNameOverride = formData.get('artistName') as string
    const albumTitleOverride = formData.get('albumTitle') as string
    const trackNumberOverride = formData.get('trackNumber') as string
    const yearOverride = formData.get('year') as string
    const genreOverride = formData.get('genre') as string
    const isPublicOverride = formData.get('isPublic') === 'true'

    if (!audioFile) {
      return NextResponse.json(
        { message: 'Audio file is required' },
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

    let metadata: any = {}
    let extractedCoverArt: Buffer | null = null

    if (extractMetadata) {
      try {
        console.log('🎵 Extracting metadata from audio file...')
        const audioBytes = await audioFile.arrayBuffer()
        const audioBuffer = Buffer.from(audioBytes)
        
        const fileMetadata = await musicMetadata.parseBuffer(audioBuffer, audioFile.type)
        
        const rawArtistStr = fileMetadata.common.artist || 'Unknown Artist'
        const rawArtists = fileMetadata.common.artists || rawArtistStr.split(/, | & | feat\. | ft\. | featuring /i).map(a => a.trim()).filter(Boolean)
        const primaryArtist = rawArtists[0] || 'Unknown Artist'
        const featuredArtistsList = rawArtists.slice(1)
        const compilation = fileMetadata.common.compilation || false
        const rawAlbumArtist = fileMetadata.common.albumartist || (compilation ? 'Various Artists' : primaryArtist)

        metadata = {
          title: fileMetadata.common.title || audioFile.name.replace(/\.[^/.]+$/, ''),
          artist: primaryArtist,
          featuredArtists: featuredArtistsList,
          albumArtist: rawAlbumArtist,
          album: fileMetadata.common.album || undefined,
          trackNumber: fileMetadata.common.track?.no || undefined,
          year: fileMetadata.common.year || undefined,
          genre: fileMetadata.common.genre?.[0] || undefined,
          duration: Math.round(fileMetadata.format.duration || 0),
          bitrate: fileMetadata.format.bitrate || undefined,
          sampleRate: fileMetadata.format.sampleRate || undefined,
          format: fileMetadata.format.codec?.toUpperCase() || audioFile.name.split('.').pop()?.toUpperCase() || 'FLAC'
        }

        // Extract cover art if available
        const picture = fileMetadata.common.picture?.[0]
        if (picture) {
          extractedCoverArt = Buffer.from(picture.data)
          console.log('🖼️ Found embedded cover art')
        }

        console.log('✅ Extracted metadata:', {
          title: metadata.title,
          artist: metadata.artist,
          featuredArtists: metadata.featuredArtists,
          albumArtist: metadata.albumArtist,
          album: metadata.album,
          duration: metadata.duration,
          format: metadata.format
        })
      } catch (error) {
        console.error('❌ Error extracting metadata:', error)
        return NextResponse.json(
          { message: 'Failed to extract metadata from audio file', error: error instanceof Error ? error.message : 'Unknown error' },
          { status: 400 }
        )
      }
    }

    // Use overrides if provided, fallback to extracted metadata, then to defaults
    const finalData = {
      title: titleOverride || metadata.title || audioFile.name.replace(/\.[^/.]+$/, ''),
      artistName: artistNameOverride || metadata.artist || 'Unknown Artist',
      albumArtistName: metadata.albumArtist || artistNameOverride || metadata.artist || 'Unknown Artist',
      featuredArtistsNames: metadata.featuredArtists || [],
      albumTitle: albumTitleOverride || metadata.album || undefined,
      trackNumber: trackNumberOverride || metadata.trackNumber || undefined,
      year: yearOverride || metadata.year || undefined,
      genre: genreOverride || metadata.genre || undefined,
      duration: metadata.duration || 0,
      bitRate: metadata.bitrate || undefined,
      sampleRate: metadata.sampleRate || undefined,
      format: metadata.format || audioFile.name.split('.').pop()?.toUpperCase() || 'FLAC',
      isPublic: isPublicOverride !== undefined ? isPublicOverride : true
    }

    if (!finalData.title || !finalData.artistName) {
      return NextResponse.json(
        { message: 'Title and artist name are required (could not extract from metadata)' },
        { status: 400 }
      )
    }

    // Handle potential artist name conflicts
    const artistOverrideId = formData.get('artistOverrideId') as string
    
    let artist: any
    
    if (artistOverrideId) {
      // Use the artist ID provided by admin after conflict resolution
      artist = await prisma.artist.findUnique({
        where: { id: artistOverrideId }
      })
      
      if (!artist) {
        return NextResponse.json({
          message: 'Selected artist not found',
          error: 'INVALID_ARTIST_OVERRIDE'
        }, { status: 400 })
      }
      
      console.log(`✅ Using existing artist: ${artist.name} (ID: ${artist.id})`)
    } else {
      // Check for existing artist with same name
      const existingArtists = await prisma.artist.findMany({
        where: { name: finalData.artistName }
      })

      if (existingArtists.length > 0) {
        // Artist name conflict - return options for admin to choose
        return NextResponse.json({
          message: `Artist "${finalData.artistName}" already exists`,
          error: 'ARTIST_CONFLICT',
          conflictingArtists: existingArtists.map(a => ({
            id: a.id,
            name: a.name,
            verified: a.verified,
            bio: a.bio
          })),
          extractedMetadata: extractMetadata ? metadata : undefined,
        }, { status: 409 })
      }

      // Create new artist
      artist = await prisma.artist.create({
        data: {
          name: finalData.artistName,
          verified: false,
        }
      })
      console.log(`✅ Created new artist: ${finalData.artistName}`)
    }

    // Resolve Album Artist
    let albumArtist = artist;
    if (finalData.albumArtistName !== finalData.artistName) {
      const existingAlbumArtist = await prisma.artist.findFirst({
        where: { name: finalData.albumArtistName }
      });
      if (existingAlbumArtist) {
        albumArtist = existingAlbumArtist;
      } else {
        albumArtist = await prisma.artist.create({
          data: { name: finalData.albumArtistName, verified: false }
        });
      }
    }

    // Resolve Featured Artists
    const featuredArtists: any[] = [];
    for (const faName of finalData.featuredArtistsNames) {
      let fa = await prisma.artist.findFirst({ where: { name: faName } });
      if (!fa) fa = await prisma.artist.create({ data: { name: faName, verified: false } });
      featuredArtists.push(fa);
    }

    // Create or find album if provided
    let album = null
    let coverImageUrl = null

    if (finalData.albumTitle) {
      // Improved lookup: Case-insensitive and trimmed to avoid duplicates like "Album " vs "Album"
      const normalizedTitle = finalData.albumTitle.trim();
      
      album = await prisma.album.findFirst({
        where: {
          title: {
            equals: normalizedTitle,
            mode: 'insensitive'
          },
          artistId: albumArtist.id
        }
      })

      if (!album) {
        // Validate year before creating Date - must be a valid number
        const parsedYear = finalData.year ? parseInt(String(finalData.year)) : null
        const validReleaseDate = parsedYear && !isNaN(parsedYear) && parsedYear > 1900 && parsedYear < 2100
          ? new Date(parsedYear, 0, 1)
          : null

        album = await prisma.album.create({
          data: {
            title: normalizedTitle,
            artistId: albumArtist.id,
            releaseDate: validReleaseDate,
            genre: finalData.genre || null,
            albumType: 'ALBUM',
            isPublic: finalData.isPublic,
            featuredArtists: featuredArtists.length > 0 ? {
              connect: featuredArtists.map(f => ({ id: f.id }))
            } : undefined
          }
        })
        console.log(`✅ Created new album: ${normalizedTitle}${validReleaseDate ? ` (Year: ${parsedYear})` : ''}`)
      } else {
        console.log(`✅ Using existing album: ${album.title} (ID: ${album.id})`)
        if (featuredArtists.length > 0) {
          await prisma.album.update({
            where: { id: album.id },
            data: {
              featuredArtists: {
                connect: featuredArtists.map(f => ({ id: f.id }))
              }
            }
          })
        }
      }

      // Handle extracted cover art
      if (extractedCoverArt && !album.coverImageUrl) {
        try {
          const imageKey = `covers/albums/${artist.name}_${finalData.albumTitle}_${Date.now()}.jpg`.replace(/[^a-zA-Z0-9-_.]/g, '_')
          
          coverImageUrl = await uploadFileToR2(
            imageKey,
            extractedCoverArt,
            'image/jpeg'
          )

          // Update album with cover
          await prisma.album.update({
            where: { id: album.id },
            data: { coverImageUrl }
          })
          
          console.log(`✅ Uploaded extracted cover art for album: ${finalData.albumTitle}`)
        } catch (error) {
          console.error('❌ Error uploading extracted cover art:', error)
        }
      }
    }

    // Check if track already exists (unique constraint on title + artistId)
    const existingTrack = await prisma.track.findFirst({
      where: {
        title: finalData.title,
        artistId: artist.id
      }
    })

    if (existingTrack) {
      return NextResponse.json({
        message: `Track "${finalData.title}" by "${finalData.artistName}" already exists`,
        error: 'DUPLICATE_TRACK',
        existingTrack: {
          id: existingTrack.id,
          title: existingTrack.title
        }
      }, { status: 409 })
    }

    // Create track record with temporary path first
    const track = await prisma.track.create({
      data: {
        title: finalData.title,
        duration: finalData.duration,
        filePath: 'temp-uploading', // Temporary path
        fileSize: BigInt(audioFile.size),
        bitRate: finalData.bitRate ? Math.round(Number(finalData.bitRate)) : null,
        sampleRate: finalData.sampleRate ? parseInt(String(finalData.sampleRate)) : null,
        format: finalData.format,
        trackNumber: finalData.trackNumber ? parseInt(String(finalData.trackNumber)) : null,
        year: finalData.year ? parseInt(String(finalData.year)) : null,
        genre: finalData.genre || null,
        isPublic: finalData.isPublic,
        artistId: artist.id,
        featuredArtists: featuredArtists.length > 0 ? {
          connect: featuredArtists.map(f => ({ id: f.id }))
        } : undefined,
        albumId: album?.id || null,
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
    
    // Debug info to compare with working test script
    console.log('📊 Upload Debug Info:')
    console.log(`   File name: ${audioFile.name}`)
    console.log(`   File size: ${(audioBuffer.length / 1024 / 1024).toFixed(2)} MB`)
    console.log(`   Content type: ${audioFile.type}`)
    console.log(`   R2 key: ${audioKey}`)
    console.log(`   Buffer type: ${Buffer.isBuffer(audioBuffer) ? 'Buffer' : 'Other'}`)
    console.log('📊 Environment:')
    console.log(`   R2 Endpoint: ${process.env.R2_ENDPOINT}`)
    console.log(`   R2 Bucket: ${process.env.R2_BUCKET_NAME}`)
    console.log(`   Node.js version: ${process.version}`)
    console.log('🧪 Test script showed this should work perfectly...')
    
    let audioUrl: string
    const fileSizeMB = audioBuffer.length / 1024 / 1024
    
    try {
      // Choose upload strategy based on file size
      if (fileSizeMB > 20) {
        console.log(`🎯 Large file detected (${fileSizeMB.toFixed(2)}MB), using large file upload strategy...`)
        audioUrl = await uploadLargeFileToR2(
          audioKey,
          audioBuffer,
          audioFile.type,
          fileSizeMB
        )
        console.log('✅ Large file upload succeeded!')
      } else {
        // For smaller files, try direct upload first
        console.log('🚀 Attempting direct upload (test script method)...')
        
        try {
          audioUrl = await uploadFileToR2Direct(
            audioKey,
            audioBuffer,
            audioFile.type
          )
          console.log('✅ Direct upload succeeded!')
        } catch (directError: any) {
          console.log('⚠️ Direct upload failed, trying with retry logic...', directError.message)
          
          // Fallback to retry logic
          audioUrl = await uploadFileToR2(
            audioKey,
            audioBuffer,
            audioFile.type
          )
          console.log('✅ Retry upload succeeded!')
        }
      }
      
    } catch (uploadError: any) {
      console.error('🚨 All upload methods failed:', uploadError.message)
      
      // Clean up the track record since upload failed
      await prisma.track.delete({
        where: { id: track.id }
      })
      
      // Provide specific guidance based on file size and error
      const isLargeFile = fileSizeMB > 20
      const isNetworkError = uploadError.code === 'ECONNRESET' || 
                            uploadError.code === 'ERR_SSL_SSLV3_ALERT_BAD_RECORD_MAC' ||
                            uploadError.message?.includes('SSL') ||
                            uploadError.message?.includes('ECONNRESET')
      
      const errorSuggestions = isNetworkError ? [
        '🌐 NETWORK CONNECTIVITY ISSUE DETECTED',
        'Your connection has SSL/TLS issues with Cloudflare R2 for larger files',
        'This is typically an ISP or network-level routing problem',
        '1️⃣ Try from a different network connection (mobile hotspot, different WiFi)',
        '2️⃣ Use a VPN to bypass potential ISP routing issues',  
        '3️⃣ Try uploading during off-peak hours (early morning/late evening)',
        '4️⃣ Contact your ISP about SSL connectivity to Cloudflare services',
        '5️⃣ If on corporate network, ask IT about Cloudflare R2 access',
        'Cover art uploads work because they\'re small - this is specifically large file SSL issues'
      ] : [
        isLargeFile 
          ? 'Large file uploads (>20MB) require stable internet - try from a wired connection'
          : 'Small/medium files should upload easily - this suggests a network configuration issue',
        'Cover art uploaded successfully, so R2 connection works - this is specifically about audio file uploads',
        'Check your internet connection stability',
        'Try from a different network (mobile hotspot)',
        'Check if firewall/proxy is blocking large file uploads to Cloudflare R2',
        'Run diagnostic: node scripts/test-r2-connection.js',
        isLargeFile 
          ? 'Consider compressing the audio file or trying during off-peak hours'
          : 'Contact network administrator if on corporate network'
      ]
      
      return NextResponse.json({
        message: isNetworkError 
          ? 'Network connectivity issue with Cloudflare R2 - try from a different connection'
          : 'Audio file upload to R2 storage failed',
        error: isNetworkError ? 'NETWORK_CONNECTIVITY_ISSUE' : 'R2_UPLOAD_FAILED',
        details: uploadError.message,
        fileInfo: {
          size: `${fileSizeMB.toFixed(2)} MB`,
          isLargeFile,
          coverUploadWorked: true,
          uploadStrategy: isLargeFile ? 'Large file multipart' : 'Direct + retry'
        },
        suggestions: errorSuggestions,
        troubleshooting: {
          endpoint: process.env.R2_ENDPOINT,
          bucket: process.env.R2_BUCKET_NAME,
          errorType: uploadError.code || uploadError.name || 'Unknown',
          testScriptWorking: true
        }
      }, { status: 503 }) // Service Unavailable
    }

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

    console.log(`🎉 Successfully uploaded track: ${finalData.title} by ${finalData.artistName}`)

    // Convert BigInt fields to strings for JSON serialization
    const serializedTrack = {
      ...updatedTrack,
      fileSize: updatedTrack.fileSize.toString(),
    }

    return NextResponse.json({
      message: 'Track uploaded successfully',
      track: serializedTrack,
      audioUrl,
      coverImageUrl: coverImageUrl || album?.coverImageUrl,
      extractedMetadata: extractMetadata ? metadata : undefined,
    })

  } catch (error) {
    console.error('Error uploading track with metadata extraction:', error)
    return NextResponse.json(
      { message: 'Internal server error', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Also provide a GET endpoint to extract metadata without uploading
export async function GET(request: NextRequest) {
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

    return NextResponse.json({
      message: 'Metadata extraction endpoint ready',
      supportedFormats: ['FLAC', 'MP3', 'WAV', 'ALAC'],
      extractableFields: [
        'title', 'artist', 'album', 'trackNumber', 'year', 
        'genre', 'duration', 'bitrate', 'sampleRate', 'coverArt'
      ]
    })

  } catch (error) {
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
