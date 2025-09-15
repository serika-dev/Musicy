# Cloudflare R2 Setup Guide for Musicy

## Overview
This guide will help you set up Cloudflare R2 bucket for storing and serving audio files in your Musicy application.

## Prerequisites
- Cloudflare account with R2 access
- R2 credentials already configured in your `.env` file

## Your Current R2 Configuration
From your `.env` file:
```
R2_ENDPOINT="https://07fe795f7d8f48a0cc6e85a6d1c12524.r2.cloudflarestorage.com"
R2_ENDPOINT_EU="https://07fe795f7d8f48a0cc6e85a6d1c12524.eu.r2.cloudflarestorage.com"
R2_ACCESS_KEY_ID="e6ca584d6f8c1ac5f53e12eebc23d359"
R2_SECRET_ACCESS_KEY="f5cff6c906677563153074a7b6ded802dc255d5d414b8e08f5763c0cfa1d40d3"
CLOUDFLARE_API_TOKEN="-3-LvK-eqzgQuhyXEZ5AWaTdNNEqEi0RDZTx6Q8s"
```

## Step 1: Create R2 Bucket via Cloudflare Dashboard

1. **Log into Cloudflare Dashboard**
   - Go to https://dash.cloudflare.com
   - Navigate to R2 Object Storage

2. **Create a New Bucket**
   - Click "Create bucket"
   - Bucket name: `musicy-audio-files`
   - Choose your region (EU for EU endpoint, US for default)
   - Click "Create bucket"

3. **Configure Public Access (for audio streaming)**
   - Go to bucket settings
   - Enable "Public access"
   - Set up custom domain (optional but recommended for performance)

## Step 2: Alternative - Create Bucket via API

If you prefer to create the bucket programmatically:

```bash
curl -X POST "https://api.cloudflare.com/client/v4/accounts/YOUR_ACCOUNT_ID/r2/buckets" \
  -H "Authorization: Bearer -3-LvK-eqzgQuhyXEZ5AWaTdNNEqEi0RDZTx6Q8s" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "musicy-audio-files",
    "defaultStorageClass": "Standard"
  }'
```

## Step 3: Update Environment Variables

Add the bucket name to your `.env`:
```
R2_BUCKET_NAME="musicy-audio-files"
```

## Step 4: Test Upload

Create a test script to verify R2 access:

```typescript
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

// Test upload
await r2.send(new PutObjectCommand({
  Bucket: "musicy-audio-files",
  Key: "test.txt",
  Body: "Hello Musicy!",
  ContentType: "text/plain"
}));
```

## Step 5: Configure CORS (for browser access)

In R2 bucket settings, add CORS configuration:
```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

## Next Steps

1. Create the bucket using the dashboard
2. Update your .env with the bucket name
3. Test audio file uploads
4. Configure CDN/custom domain for optimal performance

## File Structure in R2

Recommended folder structure:
```
musicy-audio-files/
├── tracks/
│   ├── artist-name/
│   │   ├── album-name/
│   │   │   └── track-name.flac
├── covers/
│   ├── albums/
│   └── artists/
└── temp/
    └── uploads/
```

This structure helps organize files and makes management easier.
