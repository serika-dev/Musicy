import { prisma } from "@/lib/db";
import {
  generateRenditionKey,
  uploadFileToR2,
  uploadLargeFileToB2,
} from "@/lib/r2-client";
import {
  cleanup,
  makeTempDir,
  probe,
  RENDITION_SPECS,
  type RenditionSpec,
  readFileBuffer,
  transcode,
  writeTempFile,
} from "@/lib/transcode";

const CONTENT_TYPES: Record<string, string> = {
  FLAC: "audio/flac",
  MP3: "audio/mpeg",
};

/**
 * Decide which tiers to build for a source of the given effective bitrate.
 *
 * - Lossless (FLAC) is only produced when the source is already lossless
 *   (FLAC/WAV/ALAC/PCM). Lossy sources (MP3/AAC) skip the FLAC tier.
 * - Lossy MP3 tiers are skipped when their target bitrate is >= the source
 *   bitrate to avoid pointless upscaling (e.g. a 128k MP3 source only yields
 *   the "low" tier). If the source bitrate is unknown, all tiers are built.
 */
export function selectSpecs(sourceBitrateKbps: number | null, sourceCodec: string | null = null): RenditionSpec[] {
  const isLosslessSource = !sourceCodec || ['flac', 'alac', 'pcm_s16le', 'pcm_s24le', 'pcm_f32le', 'wav', 'aiff'].includes(sourceCodec.toLowerCase());
  return RENDITION_SPECS.filter((spec) => {
    if (spec.format === "FLAC") return isLosslessSource;
    if (sourceBitrateKbps == null) return true;
    // Keep a tier if it's meaningfully below the source (allow small margin).
    return (spec.bitRateKbps ?? 0) < sourceBitrateKbps;
  });
}

/**
 * Generate (or refresh) all quality renditions for a track and persist them.
 * Idempotent: re-running upserts on the [trackId, quality] unique key.
 */
export async function ensureRenditions(trackId: string): Promise<void> {
  const track = await prisma.track.findUnique({
    where: { id: trackId },
    select: { id: true, artistId: true, filePath: true, format: true },
  });

  if (!track || !track.filePath || track.filePath === "temp-uploading") {
    console.warn(`[renditions] skip ${trackId}: no usable filePath`);
    return;
  }

  await prisma.track.update({
    where: { id: trackId },
    data: { renditionStatus: "processing" },
  });

  const workDir = await makeTempDir();
  const tempFiles: string[] = [workDir];

  try {
    // 1. Download the original.
    const res = await fetch(track.filePath);
    if (!res.ok) {
      throw new Error(`download failed: ${res.status} ${res.statusText}`);
    }
    const originalBuf = Buffer.from(await res.arrayBuffer());
    const srcExt = (track.format || "audio").toLowerCase();
    const srcPath = await writeTempFile(
      workDir,
      `source.${srcExt}`,
      originalBuf,
    );

    // 2. Probe the original to decide tiers.
    const srcMeta = await probe(srcPath);
    const specs = selectSpecs(srcMeta.bitRateKbps, srcMeta.codec);

    // 3. Transcode + upload + persist each tier.
    for (const spec of specs) {
      const outPath = await transcode(srcPath, spec);
      tempFiles.push(outPath);

      const outMeta = await probe(outPath);
      const outBuf = await readFileBuffer(outPath);
      const key = generateRenditionKey(
        track.artistId,
        track.id,
        spec.quality,
        spec.format,
      );
      const contentType =
        CONTENT_TYPES[spec.format] || "application/octet-stream";
      const sizeMB = outBuf.length / (1024 * 1024);

      const url =
        sizeMB > 15
          ? await uploadLargeFileToB2(key, outBuf, contentType, sizeMB)
          : await uploadFileToR2(key, outBuf, contentType);

      await prisma.trackRendition.upsert({
        where: {
          trackId_quality: { trackId: track.id, quality: spec.quality },
        },
        create: {
          trackId: track.id,
          quality: spec.quality,
          format: spec.format,
          filePath: url,
          fileSize: BigInt(outBuf.length),
          bitRate: spec.bitRateKbps ?? outMeta.bitRateKbps ?? null,
          sampleRate: outMeta.sampleRate ?? srcMeta.sampleRate ?? null,
        },
        update: {
          format: spec.format,
          filePath: url,
          fileSize: BigInt(outBuf.length),
          bitRate: spec.bitRateKbps ?? outMeta.bitRateKbps ?? null,
          sampleRate: outMeta.sampleRate ?? srcMeta.sampleRate ?? null,
        },
      });

      console.log(
        `[renditions] ${track.id} ${spec.quality} (${spec.format}) → ${(sizeMB).toFixed(1)}MB`,
      );
    }

    await prisma.track.update({
      where: { id: trackId },
      data: { renditionStatus: "ready" },
    });
  } catch (err) {
    console.error(`[renditions] failed for ${trackId}:`, err);
    await prisma.track
      .update({ where: { id: trackId }, data: { renditionStatus: "failed" } })
      .catch(() => undefined);
    throw err;
  } finally {
    await cleanup(...tempFiles);
  }
}
