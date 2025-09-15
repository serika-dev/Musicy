import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

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

    const { searchParams } = new URL(request.url)
    const artistName = searchParams.get('artist_name')
    const trackName = searchParams.get('track_name')

    if (!artistName || !trackName) {
      return NextResponse.json(
        { message: 'Both artist_name and track_name are required' },
        { status: 400 }
      )
    }

    // Search LRCLib API
    console.log('🔍 Searching LRCLib for:', { artistName, trackName })
    
    try {
      // First try direct get endpoint
      const getUrl = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(artistName)}&track_name=${encodeURIComponent(trackName)}`
      console.log('📡 Trying direct get:', getUrl)
      
      const lrcResponse = await fetch(getUrl)
      console.log('📥 Direct get response status:', lrcResponse.status)

      if (lrcResponse.ok) {
        const lrcData = await lrcResponse.json()
        console.log('✅ Direct get success:', { id: lrcData.id, title: lrcData.name })
        
        // Check if we got actual lyrics data
        if (lrcData && (lrcData.plainLyrics || lrcData.syncedLyrics)) {
          return NextResponse.json({
            found: true,
            data: lrcData,
            source: 'direct'
          })
        }
      }

      // If direct get failed, try search endpoint
      const searchUrl = `https://lrclib.net/api/search?artist_name=${encodeURIComponent(artistName)}&track_name=${encodeURIComponent(trackName)}`
      console.log('📡 Trying search endpoint:', searchUrl)
      
      const searchResponse = await fetch(searchUrl)
      console.log('📥 Search response status:', searchResponse.status)

      if (searchResponse.ok) {
        const searchData = await searchResponse.json()
        console.log('📋 Search results count:', Array.isArray(searchData) ? searchData.length : 'Not array')
        
        if (Array.isArray(searchData) && searchData.length > 0) {
          // Find the best match (first one with lyrics)
          const lyricsMatch = searchData.find(item => 
            item.plainLyrics || item.syncedLyrics
          )
          
          if (lyricsMatch) {
            console.log('✅ Found lyrics in search results:', { 
              id: lyricsMatch.id, 
              title: lyricsMatch.name,
              hasPlain: !!lyricsMatch.plainLyrics,
              hasSynced: !!lyricsMatch.syncedLyrics
            })
            
            return NextResponse.json({
              found: true,
              data: lyricsMatch,
              source: 'search',
              totalResults: searchData.length
            })
          } else {
            console.log('⚠️ Search found results but no lyrics content')
            return NextResponse.json({
              found: false,
              message: 'Search found tracks but no lyrics content',
              resultsFound: searchData.length,
              results: searchData.map(item => ({
                id: item.id,
                name: item.name,
                artist: item.artistName,
                hasLyrics: !!(item.plainLyrics || item.syncedLyrics)
              }))
            })
          }
        } else {
          console.log('❌ Search returned empty results')
        }
      } else {
        console.log('❌ Search API failed with status:', searchResponse.status)
      }

      return NextResponse.json({
        found: false,
        message: 'No lyrics found for this track on LRCLib',
        searchAttempts: {
          directGet: { attempted: true, status: lrcResponse.status },
          search: { attempted: true, status: searchResponse.status }
        }
      })

    } catch (lrcError) {
      console.error('❌ LRCLib API error:', lrcError)
      return NextResponse.json({
        found: false,
        message: 'Failed to search LRCLib API',
        error: lrcError instanceof Error ? lrcError.message : 'Unknown error'
      })
    }

  } catch (error) {
    console.error('Error searching lyrics:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
