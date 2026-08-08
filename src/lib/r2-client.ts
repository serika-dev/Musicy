import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

// Initialize Backblaze B2 client (S3-compatible)
export const b2Client = new S3Client({
  region: "eu-central-003",
  endpoint: process.env.B2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.B2_KEY_ID!,
    secretAccessKey: process.env.B2_APP_KEY!,
  },
  forcePathStyle: true,
  maxAttempts: 3,
});

export const B2_BUCKET = process.env.B2_BUCKET_NAME!;

/**
 * Upload a file to Backblaze B2 storage
 */
export async function uploadFileToB2(
  key: string,
  body: Buffer | Uint8Array | string,
  contentType: string,
): Promise<string> {
  const maxRetries = 3;
  let lastError: any = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const command = new PutObjectCommand({
        Bucket: B2_BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
      });

      await b2Client.send(command);

      const url = getPublicUrl(key);
      return url;
    } catch (error: any) {
      lastError = error;
      console.error(
        `Upload attempt ${attempt} failed:`,
        error.message || error,
      );

      if (attempt < maxRetries) {
        const delay = attempt * 2000;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      break;
    }
  }

  throw new Error(
    `Failed to upload to B2 after ${maxRetries} attempts: ${lastError?.message || "Unknown error"}`,
  );
}

/**
 * Upload large files to B2 using multipart
 */
export async function uploadLargeFileToB2(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
  fileSizeMB: number,
): Promise<string> {
  const {
    CreateMultipartUploadCommand,
    UploadPartCommand,
    CompleteMultipartUploadCommand,
    AbortMultipartUploadCommand,
  } = await import("@aws-sdk/client-s3");

  let UploadId: string | undefined;

  try {
    const createResult = await b2Client.send(
      new CreateMultipartUploadCommand({
        Bucket: B2_BUCKET,
        Key: key,
        ContentType: contentType,
      }),
    );
    UploadId = createResult.UploadId;

    const chunkSize = 10 * 1024 * 1024;
    const buffer = Buffer.isBuffer(body) ? body : Buffer.from(body);
    const chunks: Buffer[] = [];

    for (let i = 0; i < buffer.length; i += chunkSize) {
      chunks.push(buffer.slice(i, i + chunkSize));
    }

    const parts = [];
    for (let index = 0; index < chunks.length; index++) {
      const partNumber = index + 1;
      const result = await b2Client.send(
        new UploadPartCommand({
          Bucket: B2_BUCKET,
          Key: key,
          PartNumber: partNumber,
          UploadId,
          Body: chunks[index],
        }),
      );
      parts.push({ ETag: result.ETag, PartNumber: partNumber });
    }

    await b2Client.send(
      new CompleteMultipartUploadCommand({
        Bucket: B2_BUCKET,
        Key: key,
        UploadId,
        MultipartUpload: { Parts: parts },
      }),
    );

    return getPublicUrl(key);
  } catch (error: any) {
    if (UploadId) {
      try {
        const { AbortMultipartUploadCommand: AbortCmd } = await import(
          "@aws-sdk/client-s3"
        );
        await b2Client.send(
          new AbortCmd({ Bucket: B2_BUCKET, Key: key, UploadId }),
        );
      } catch (_) {
        /* cleanup best-effort */
      }
    }
    throw new Error(`Multipart upload failed: ${error.message}`);
  }
}

/**
 * Generate public URL for a B2 object
 */
export function getPublicUrl(key: string): string {
  const publicDomain = process.env.B2_PUBLIC_DOMAIN;
  if (publicDomain) {
    return `${publicDomain}/${key}`;
  }
  return `${process.env.B2_ENDPOINT}/${B2_BUCKET}/${key}`;
}

/**
 * Delete a file from B2 storage
 */
export async function deleteFileFromB2(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: B2_BUCKET,
    Key: key,
  });
  await b2Client.send(command);
}

/**
 * Generate file key for audio files
 */
export function generateAudioFileKey(
  artistId: string,
  trackId: string,
  format: string,
): string {
  return `tracks/${artistId}/${trackId}.${format.toLowerCase()}`;
}

/**
 * Generate file key for a transcoded quality rendition of a track.
 * Renditions live under a per-track folder so they never collide with the
 * flat original key produced by generateAudioFileKey.
 */
export function generateRenditionKey(
  artistId: string,
  trackId: string,
  quality: string,
  format: string,
): string {
  return `tracks/${artistId}/${trackId}/${quality}.${format.toLowerCase()}`;
}

/**
 * Generate file key for cover images
 */
export function generateCoverImageKey(
  type: "album" | "artist",
  name: string,
): string {
  const sanitize = (str: string) =>
    str.replace(/[^a-zA-Z0-9-_]/g, "_").toLowerCase();
  return `covers/${type}s/${sanitize(name)}.jpg`;
}

// Re-export with old names for backwards compatibility
export const r2Client = b2Client;
export const R2_BUCKET = B2_BUCKET;
export const uploadFileToR2 = uploadFileToB2;
export const uploadFileToR2Direct = uploadFileToB2;
export const uploadLargeFileToR2 = uploadLargeFileToB2;
export const deleteFileFromR2 = deleteFileFromB2;

export default b2Client;
