import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { uploadFileToR2 } from '@/lib/r2-client'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as string // 'profile' or 'playlist'
    const entityId = formData.get('entityId') as string

    if (!file || !type) {
      return NextResponse.json({ message: 'File and type are required' }, { status: 400 })
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ message: 'Only image files are allowed' }, { status: 400 })
    }

    // Validate file size (max 15MB)
    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json({ message: 'File size must be less than 15MB' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Generate unique R2 key
    const fileExtension = file.name ? file.name.split('.').pop() : 'jpg'
    const filename = `${entityId || session.user.id}_${Date.now()}.${fileExtension || 'jpg'}`
    const r2Key = `${type}/${filename}` // 'profiles/...' or 'playlists/...'

    // Upload to R2
    const publicUrl = await uploadFileToR2(
      r2Key,
      buffer,
      file.type
    )

    return NextResponse.json({ 
      message: 'File uploaded successfully',
      url: publicUrl 
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
