import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Thin ffmpeg / ffprobe wrappers for generating streaming quality renditions.
 *
 * Both binaries must be available on PATH (they are on the app host, and
 * `ffmpeg` is added to nixpacks for production builds).
 */

const FFMPEG_BIN = process.env.FFMPEG_PATH || "ffmpeg";
const FFPROBE_BIN = process.env.FFPROBE_PATH || "ffprobe";

export interface AudioMeta {
  durationSec: number;
  /** Overall bitrate in kbps (best effort — falls back to stream bitrate). */
  bitRateKbps: number | null;
  sampleRate: number | null;
  /** e.g. "mp3", "flac", "pcm_s16le", "aac", "alac" */
  codec: string | null;
}

export type RenditionQuality = "lossless" | "high" | "medium" | "low";

export interface RenditionSpec {
  quality: RenditionQuality;
  format: "FLAC" | "MP3";
  /** Target bitrate in kbps for lossy tiers; null for lossless. */
  bitRateKbps: number | null;
}

/** Canonical rendition tiers, highest → lowest. */
export const RENDITION_SPECS: RenditionSpec[] = [
  { quality: "lossless", format: "FLAC", bitRateKbps: null },
  { quality: "high", format: "MP3", bitRateKbps: 320 },
  { quality: "medium", format: "MP3", bitRateKbps: 192 },
  { quality: "low", format: "MP3", bitRateKbps: 128 },
];

function run(bin: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => {
      stdout += d.toString();
    });
    child.stderr.on("data", (d) => {
      stderr += d.toString();
    });
    child.on("error", (err) =>
      reject(new Error(`${bin} failed to start: ${err.message}`)),
    );
    child.on("close", (code) => {
      if (code === 0) resolve(stdout);
      else
        reject(
          new Error(`${bin} exited with code ${code}: ${stderr.slice(-2000)}`),
        );
    });
  });
}

/** Probe an audio file for duration, bitrate, sample rate and codec. */
export async function probe(inputPath: string): Promise<AudioMeta> {
  const out = await run(FFPROBE_BIN, [
    "-v",
    "quiet",
    "-print_format",
    "json",
    "-show_format",
    "-show_streams",
    inputPath,
  ]);

  const parsed = JSON.parse(out) as {
    format?: { duration?: string; bit_rate?: string };
    streams?: Array<{
      codec_type?: string;
      codec_name?: string;
      sample_rate?: string;
      bit_rate?: string;
    }>;
  };

  const audioStream = parsed.streams?.find((s) => s.codec_type === "audio");

  const toKbps = (raw?: string) => {
    if (!raw) return null;
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return null;
    return Math.round(n / 1000);
  };

  return {
    durationSec: parsed.format?.duration
      ? Math.round(Number(parsed.format.duration))
      : 0,
    bitRateKbps:
      toKbps(parsed.format?.bit_rate) ?? toKbps(audioStream?.bit_rate),
    sampleRate: audioStream?.sample_rate
      ? Number(audioStream.sample_rate)
      : null,
    codec: audioStream?.codec_name ?? null,
  };
}

/**
 * Transcode `inputPath` to a new temp file according to `spec`.
 * Returns the output file path (caller is responsible for cleanup).
 */
export async function transcode(
  inputPath: string,
  spec: RenditionSpec,
): Promise<string> {
  const ext = spec.format === "FLAC" ? "flac" : "mp3";
  const outPath = join(tmpdir(), `musicy-${randomUUID()}.${ext}`);

  // -map 0:a:0 : first audio stream only (drops embedded cover art / video
  //              streams that break some MP3/FLAC decoders).
  // -map_metadata 0 : carry over tags (title/artist/etc).
  const args = ["-hide_banner", "-loglevel", "error", "-y", "-i", inputPath];

  if (spec.format === "FLAC") {
    args.push("-c:a", "flac", "-compression_level", "8");
  } else {
    args.push("-c:a", "libmp3lame", "-b:a", `${spec.bitRateKbps}k`);
  }

  args.push("-map", "0:a:0", "-map_metadata", "0", "-vn", outPath);

  await run(FFMPEG_BIN, args);
  return outPath;
}

/** Create a temp working directory. */
export function makeTempDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), "musicy-rend-"));
}

/** Write a buffer to a temp file inside `dir` and return its path. */
export async function writeTempFile(
  dir: string,
  name: string,
  data: Buffer,
): Promise<string> {
  const p = join(dir, name);
  await writeFile(p, data);
  return p;
}

export async function readFileBuffer(path: string): Promise<Buffer> {
  return readFile(path);
}

/** Best-effort recursive cleanup. */
export async function cleanup(...paths: string[]): Promise<void> {
  await Promise.all(
    paths.map((p) =>
      rm(p, { recursive: true, force: true }).catch(() => undefined),
    ),
  );
}
