"use client";

import { Capacitor, registerPlugin } from "@capacitor/core";
import type { Track } from "@/types/track";

export interface NativeDownloadedTrack {
  id: string;
  title: string;
  artistName: string;
  artistId?: string;
  albumTitle?: string;
  albumId?: string;
  coverImageUrl?: string;
  artworkUri?: string;
  fileUri: string;
  format?: string;
  duration: number;
  sizeBytes: number;
  downloadedAt: number;
}

interface NativeDownloadResult extends NativeDownloadedTrack {
  mimeType?: string;
}

interface MusicyDownloadsPlugin {
  downloadTrack(options: {
    sourceUrl: string;
    coverImageUrl?: string;
    track: {
      id: string;
      title: string;
      duration: number;
      format: string;
      genre?: string;
      artistId?: string;
      artistName: string;
      albumId?: string;
      albumTitle?: string;
      coverImageUrl?: string;
    };
  }): Promise<NativeDownloadResult>;
  removeTrack(options: { id: string }): Promise<void>;
  getDownloads(): Promise<{ tracks: NativeDownloadedTrack[] }>;
  getTrackUri(options: { id: string }): Promise<{ fileUri?: string }>;
  playTrack(options: { id: string }): Promise<void>;
}

const MusicyDownloads =
  registerPlugin<MusicyDownloadsPlugin>("MusicyDownloads");

export function isNativeDownloadsAvailable() {
  return typeof window !== "undefined" && Capacitor.getPlatform() !== "web";
}

function absoluteUrl(url?: string | null) {
  if (!url || typeof window === "undefined") return undefined;

  try {
    return new URL(url, window.location.origin).toString();
  } catch {
    return undefined;
  }
}

export async function downloadTrackNatively(
  track: Track,
): Promise<NativeDownloadResult | null> {
  if (!isNativeDownloadsAvailable()) return null;

  // Use the server-side proxy to avoid CORS issues with B2/R2
  const sourceUrl = absoluteUrl(`/api/tracks/${track.id}/download`);
  if (!sourceUrl) return null;

  try {
    return await MusicyDownloads.downloadTrack({
      sourceUrl,
      coverImageUrl: absoluteUrl(
        track.coverImageUrl || track.album?.coverImageUrl,
      ),
      track: {
        id: track.id,
        title: track.title,
        duration: track.duration,
        format: track.format,
        genre: track.genre,
        artistId: track.artist.id,
        artistName: track.artist.name,
        albumId: track.album?.id,
        albumTitle: track.album?.title,
        coverImageUrl: absoluteUrl(
          track.coverImageUrl || track.album?.coverImageUrl,
        ),
      },
    });
  } catch (error) {
    console.warn(
      "Native download failed; web offline copy is still available.",
      error,
    );
    return null;
  }
}

export async function removeNativeDownload(trackId: string) {
  if (!isNativeDownloadsAvailable()) return;

  try {
    await MusicyDownloads.removeTrack({ id: trackId });
  } catch (error) {
    console.warn("Native download removal failed.", error);
  }
}

export async function getNativeDownloads(): Promise<NativeDownloadedTrack[]> {
  if (!isNativeDownloadsAvailable()) return [];

  try {
    const result = await MusicyDownloads.getDownloads();
    return result.tracks ?? [];
  } catch (error) {
    console.warn("Failed to load native downloads.", error);
    return [];
  }
}

export async function getNativeTrackFileSrc(
  trackId: string,
): Promise<string | null> {
  if (!isNativeDownloadsAvailable()) return null;

  try {
    const result = await MusicyDownloads.getTrackUri({ id: trackId });
    return result.fileUri ? Capacitor.convertFileSrc(result.fileUri) : null;
  } catch {
    return null;
  }
}

export async function playNativeDownloadedTrack(trackId: string) {
  if (!isNativeDownloadsAvailable()) return;

  try {
    await MusicyDownloads.playTrack({ id: trackId });
  } catch (error) {
    console.warn("Failed to hand off playback to native media service.", error);
  }
}

export function nativeDownloadToTrack(download: NativeDownloadedTrack): Track {
  return {
    id: download.id,
    title: download.title,
    duration: download.duration,
    coverImageUrl: download.coverImageUrl || download.artworkUri,
    filePath: download.fileUri,
    format: download.format || "LOCAL",
    artist: {
      id: download.artistId || download.artistName,
      name: download.artistName,
    },
    album: download.albumTitle
      ? {
          id: download.albumId || download.albumTitle,
          title: download.albumTitle,
          coverImageUrl: download.coverImageUrl || download.artworkUri,
        }
      : undefined,
  };
}
