import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { S3Client, PutObjectCommand, ListBucketsCommand } from '@aws-sdk/client-s3'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Only allow admins to test R2 connection
    if (!session || !session.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // Additional admin check - you might want to add role checking here
    console.log('🧪 R2 Connection Test initiated by:', session.user.email)

    const testResults = {
      timestamp: new Date().toISOString(),
      endpoint: process.env.R2_ENDPOINT,
      bucket: process.env.R2_BUCKET_NAME,
      tests: [] as any[]
    }

    // Test different client configurations
    const configs = [
      {
        name: 'Standard Config',
        client: new S3Client({
          region: "auto",
          endpoint: process.env.R2_ENDPOINT!,
          credentials: {
            accessKeyId: process.env.R2_ACCESS_KEY_ID!,
            secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
          },
        })
      },
      {
        name: 'Enhanced Config (with timeouts)',
        client: new S3Client({
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
      }
    ]

    for (const config of configs) {
      console.log(`Testing: ${config.name}`)
      const testResult: any = {
        configName: config.name,
        tests: [],
        overall: 'FAILED'
      }

      try {
        // Test 1: List buckets
        console.log('  - Testing bucket list...')
        const listStart = Date.now()
        const listCommand = new ListBucketsCommand({})
        const listResult = await config.client.send(listCommand)
        const listTime = Date.now() - listStart
        
        testResult.tests.push({
          name: 'Bucket List',
          success: true,
          time: listTime,
          details: `Found ${listResult.Buckets?.length || 0} buckets`
        })

        // Test 2: Small file upload
        console.log('  - Testing small file upload...')
        const testKey = `test/admin-connection-test-${Date.now()}.txt`
        const testContent = `R2 Connection Test\nTimestamp: ${new Date().toISOString()}\nUser: ${session.user.email}`
        
        const putStart = Date.now()
        const putCommand = new PutObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME!,
          Key: testKey,
          Body: testContent,
          ContentType: 'text/plain',
        })
        
        await config.client.send(putCommand)
        const putTime = Date.now() - putStart
        
        testResult.tests.push({
          name: 'Small File Upload',
          success: true,
          time: putTime,
          details: `Uploaded ${testContent.length} bytes`
        })

        // Test 3: Larger file upload (simulating audio file)
        console.log('  - Testing larger file upload...')
        const largeTestKey = `test/admin-large-test-${Date.now()}.bin`
        
        // Create a 5MB test buffer (smaller than typical FLAC but representative)
        const largeContent = Buffer.alloc(5 * 1024 * 1024, 'A')
        
        const largePutStart = Date.now()
        const largePutCommand = new PutObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME!,
          Key: largeTestKey,
          Body: largeContent,
          ContentType: 'application/octet-stream',
          Metadata: {
            'test-file': 'true',
            'size': '5MB'
          }
        })
        
        await config.client.send(largePutCommand)
        const largePutTime = Date.now() - largePutStart
        
        testResult.tests.push({
          name: 'Large File Upload (5MB)',
          success: true,
          time: largePutTime,
          details: `Uploaded 5MB in ${largePutTime}ms`
        })

        testResult.overall = 'PASSED'
        console.log(`  ✅ ${config.name}: All tests passed`)

      } catch (error: any) {
        console.error(`  ❌ ${config.name} failed:`, error.message)
        
        testResult.tests.push({
          name: 'Connection Test',
          success: false,
          error: {
            message: error.message,
            code: error.code,
            name: error.name,
            statusCode: error.$metadata?.httpStatusCode
          }
        })
      }

      testResults.tests.push(testResult)
    }

    // Overall assessment
    const successfulConfigs = testResults.tests.filter(t => t.overall === 'PASSED')
    const overallSuccess = successfulConfigs.length > 0

    console.log(`🏁 R2 Test Complete: ${overallSuccess ? 'PASSED' : 'FAILED'}`)

    return NextResponse.json({
      success: overallSuccess,
      message: overallSuccess 
        ? `R2 connection working! ${successfulConfigs.length}/${testResults.tests.length} configurations successful`
        : 'R2 connection failed with all configurations',
      results: testResults,
      recommendations: overallSuccess ? [
        'R2 connection is working properly',
        'Upload failures may be due to file size or temporary network issues',
        'Try uploading smaller files or during different times'
      ] : [
        'Check R2 credentials in environment variables',
        'Verify R2 endpoint URL is correct',
        'Test from different network (mobile hotspot)',
        'Check firewall/proxy settings',
        'Contact Cloudflare support if issues persist'
      ]
    })

  } catch (error) {
    console.error('R2 test endpoint error:', error)
    return NextResponse.json({
      success: false,
      message: 'R2 test failed to run',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
