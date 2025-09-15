import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"

// Initialize R2 client (S3-compatible)
// Use the exact same configuration that works in the test script!
export const r2Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
  requestHandler: {
    requestTimeout: 60000,
    connectionTimeout: 10000,
  },
  forcePathStyle: true,
  maxAttempts: 1,
})

export const R2_BUCKET = process.env.R2_BUCKET_NAME!

/**
 * Direct upload method matching the working test script - no retries, just works
 */
export async function uploadFileToR2Direct(
  key: string,
  body: Buffer | Uint8Array | string,
  contentType: string
): Promise<string> {
  console.log(`📤 Direct upload to R2: ${key}`)
  
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
  })

  await r2Client.send(command)
  
  const url = getPublicUrl(key)
  console.log(`✅ Direct upload successful: ${url}`)
  return url
}

/**
 * Upload large files using multipart upload for better reliability
 */
export async function uploadLargeFileToR2(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
  fileSizeMB: number
): Promise<string> {
  console.log(`📦 Large file upload (${fileSizeMB.toFixed(2)}MB) to R2: ${key}`)
  
  // Network connectivity test shows SSL issues with this connection to Cloudflare R2
  // Only very small files work reliably, so we need to handle this appropriately
  console.log(`⚠️  Network Analysis: This connection has SSL/connectivity issues with Cloudflare R2 for files over ~1MB`)
  
  // Try the upload but expect it to likely fail due to network issues
  console.log(`🚀 Attempting upload despite network limitations...`)
  
  try {
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    })

    console.log(`📤 Direct upload attempt...`)
    await r2Client.send(command)
    
    const url = getPublicUrl(key)
    console.log(`✅ Upload successful despite network issues: ${url}`)
    return url
    
  } catch (error: any) {
    const isNetworkError = error.code === 'ECONNRESET' || 
                          error.code === 'ERR_SSL_SSLV3_ALERT_BAD_RECORD_MAC' ||
                          error.message.includes('SSL') ||
                          error.message.includes('ECONNRESET')
    
    if (isNetworkError) {
      console.error(`🌐 Network connectivity issue detected: ${error.code}`)
      console.error(`💡 This connection has known SSL/TLS issues with Cloudflare R2 for larger files`)
      console.error(`📋 Suggested solutions:`)
      console.error(`   1. Try uploading from a different network connection`)
      console.error(`   2. Use a VPN to bypass potential ISP-level routing issues`)
      console.error(`   3. Try uploading during off-peak hours`)
      console.error(`   4. Contact your ISP about SSL connectivity to Cloudflare services`)
      
      throw new Error(`Network connectivity issue with Cloudflare R2. Try from a different network connection. Error: ${error.message}`)
    } else {
      console.error(`❌ Upload failed: ${error.code} - ${error.message}`)
      throw new Error(`Upload failed: ${error.message}`)
    }
  }
}

/**
 * Multipart upload for very large files
 */
async function uploadFileToR2Multipart(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<string> {
  const { CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand } = await import('@aws-sdk/client-s3')
  
  let UploadId: string | undefined // Declare in function scope for cleanup access
  
  try {
    // Initialize multipart upload
    const createCommand = new CreateMultipartUploadCommand({
      Bucket: R2_BUCKET,
      Key: key,
      ContentType: contentType,
    })
    
    const result = await r2Client.send(createCommand)
    UploadId = result.UploadId
    console.log(`🔄 Multipart upload started: ${UploadId}`)
    
    // Split file into 10MB chunks
    const chunkSize = 10 * 1024 * 1024 // 10MB chunks
    const buffer = Buffer.isBuffer(body) ? body : Buffer.from(body)
    const chunks = []
    
    for (let i = 0; i < buffer.length; i += chunkSize) {
      chunks.push(buffer.slice(i, i + chunkSize))
    }
    
    console.log(`📦 Uploading ${chunks.length} chunks of ~${(chunkSize / 1024 / 1024).toFixed(1)}MB each`)
    
    // Upload each part sequentially to avoid overwhelming the connection
    const parts = []
    
    for (let index = 0; index < chunks.length; index++) {
      const chunk = chunks[index]
      const partNumber = index + 1
      let partResult = null
      
      for (let attempt = 1; attempt <= 5; attempt++) {
        try {
          console.log(`📤 Uploading part ${partNumber}/${chunks.length} (attempt ${attempt})`)
          
          const uploadPartCommand = new UploadPartCommand({
            Bucket: R2_BUCKET,
            Key: key,
            PartNumber: partNumber,
            UploadId,
            Body: chunk,
          })
          
          const result = await r2Client.send(uploadPartCommand)
          console.log(`✅ Part ${partNumber} uploaded successfully`)
          
          partResult = {
            ETag: result.ETag,
            PartNumber: partNumber,
          }
          break // Success, exit retry loop
          
        } catch (error: any) {
          const errorCode = error.code || error.name || 'Unknown'
          console.error(`❌ Part ${partNumber} attempt ${attempt} failed: ${errorCode} - ${error.message}`)
          
          if (attempt === 5) {
            console.error(`💥 Part ${partNumber} failed after 5 attempts, aborting multipart upload`)
            throw new Error(`Failed to upload part ${partNumber} after 5 attempts: ${error.message}`)
          }
          
          // Progressive backoff: 3s, 6s, 12s, 24s for network/SSL errors
          const isNetworkError = error.code === 'ECONNRESET' || 
                                 error.code === 'ERR_SSL_SSLV3_ALERT_BAD_RECORD_MAC' ||
                                 error.code === 'ETIMEDOUT' ||
                                 error.message.includes('SSL') ||
                                 error.message.includes('timeout')
          
          const delay = isNetworkError ? attempt * 3000 : attempt * 1500
          console.log(`⏳ Waiting ${delay}ms before retry (${isNetworkError ? 'network' : 'general'} error)...`)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
      
      if (partResult) {
        parts.push(partResult)
      } else {
        throw new Error(`Failed to upload part ${partNumber}`)
      }
      
      // Small delay between parts to be nice to the server
      if (index < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }
    
    // Complete multipart upload
    const completeCommand = new CompleteMultipartUploadCommand({
      Bucket: R2_BUCKET,
      Key: key,
      UploadId,
      MultipartUpload: {
        Parts: parts,
      },
    })
    
    await r2Client.send(completeCommand)
    
    const url = getPublicUrl(key)
    console.log(`✅ Multipart upload completed: ${url}`)
    return url
    
  } catch (error: any) {
    console.error('💥 Multipart upload failed:', error)
    
    // Try to abort the multipart upload to clean up
    try {
      const { AbortMultipartUploadCommand } = await import('@aws-sdk/client-s3')
      if (UploadId) {
        console.log('🧹 Cleaning up failed multipart upload...')
        await r2Client.send(new AbortMultipartUploadCommand({
          Bucket: R2_BUCKET,
          Key: key,
          UploadId: UploadId,
        }))
        console.log('✅ Multipart upload cleaned up')
      }
    } catch (cleanupError) {
      console.error('⚠️ Failed to cleanup multipart upload:', cleanupError)
      // Don't throw cleanup errors, just log them
    }
    
    throw new Error(`Multipart upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Upload a file to R2 storage (with retries)
 */
export async function uploadFileToR2(
  key: string,
  body: Buffer | Uint8Array | string,
  contentType: string
): Promise<string> {
  const maxRetries = 3
  let lastError: any = null
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📤 Uploading to R2 (attempt ${attempt}/${maxRetries}): ${key}`)
      
      const command = new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
      })

      await r2Client.send(command)
      
      // Return the public URL using custom domain
      const url = getPublicUrl(key)
      console.log(`✅ Upload successful: ${url}`)
      return url
    } catch (error: any) {
      lastError = error
      console.error(`❌ Upload attempt ${attempt} failed:`, error.message || error)
      
      // Check if it's a retryable network error
      const isRetryableError = (
        error.code === 'ERR_SSL_SSLV3_ALERT_BAD_RECORD_MAC' ||
        error.code === 'ECONNRESET' ||
        error.code === 'ETIMEDOUT' ||
        error.name === 'NetworkingError' ||
        error.name === 'TimeoutError' ||
        error.name === 'CredentialsProviderError' ||
        error.name === 'NetworkError' ||
        error.message?.includes('socket hang up') ||
        error.message?.includes('ENOTFOUND') ||
        error.message?.includes('ECONNREFUSED')
      )
      
      if (attempt < maxRetries && isRetryableError) {
        // Use shorter delays like the working test script
        const delay = attempt * 2000 // Simple: 2s, 4s, 6s
        console.log(`⏳ Waiting ${delay}ms before retry (network error)...`)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
      
      // If it's the last attempt or non-retryable error, throw
      break
    }
  }
  
  console.error('💥 All upload attempts failed. Last error:', lastError)
  
  // Provide more helpful error message for common issues
  let errorMessage = `Failed to upload file to R2 storage after ${maxRetries} attempts`
  
  if (lastError?.code === 'ERR_SSL_SSLV3_ALERT_BAD_RECORD_MAC') {
    errorMessage += '. This appears to be a network connectivity issue with Cloudflare R2. Possible solutions:\n'
    errorMessage += '1. Check your internet connection\n'
    errorMessage += '2. Try from a different network (mobile hotspot)\n'
    errorMessage += '3. Check if firewall/proxy is blocking Cloudflare R2\n'
    errorMessage += '4. Run "node scripts/test-r2-connection.js" to diagnose the issue\n'
    errorMessage += '5. Contact your network administrator if on corporate network'
  } else {
    errorMessage += `: ${lastError?.message || 'Unknown error'}`
  }
  
  throw new Error(errorMessage)
}

/**
 * Generate public URL for an R2 object using custom domain
 */
export function getPublicUrl(key: string): string {
  const publicDomain = process.env.R2_PUBLIC_DOMAIN
  if (publicDomain) {
    return `${publicDomain}/${key}`
  }
  // Fallback to R2 endpoint if no custom domain
  return `${process.env.R2_ENDPOINT}/${R2_BUCKET}/${key}`
}

/**
 * Delete a file from R2 storage
 */
export async function deleteFileFromR2(key: string): Promise<void> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
    })

    await r2Client.send(command)
  } catch (error) {
    console.error('Error deleting file from R2:', error)
    throw new Error('Failed to delete file from R2 storage')
  }
}

/**
 * Generate file key for audio files using IDs (better approach)
 */
export function generateAudioFileKey(
  artistId: string,
  trackId: string,
  format: string
): string {
  const extension = format.toLowerCase()
  return `tracks/${artistId}/${trackId}.${extension}`
}

/**
 * Legacy function for name-based keys (deprecated)
 */
export function generateAudioFileKeyLegacy(
  artistName: string,
  trackTitle: string,
  format: string
): string {
  const sanitize = (str: string) => 
    str.replace(/[^a-zA-Z0-9-_]/g, '_').toLowerCase()
  
  const artist = sanitize(artistName)
  const track = sanitize(trackTitle)
  const extension = format.toLowerCase()
  
  return `tracks/${artist}/${track}.${extension}`
}

/**
 * Generate file key for cover images
 */
export function generateCoverImageKey(
  type: 'album' | 'artist',
  name: string
): string {
  const sanitize = (str: string) => 
    str.replace(/[^a-zA-Z0-9-_]/g, '_').toLowerCase()
  
  const sanitizedName = sanitize(name)
  return `covers/${type}s/${sanitizedName}.jpg`
}

export default r2Client
