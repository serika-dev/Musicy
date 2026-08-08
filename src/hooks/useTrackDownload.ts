"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  downloadTrackNatively,
  removeNativeDownload,
} from "@/lib/native-downloads";
import {
  isTrackDownloaded,
  removeOfflineTrack,
  saveTrackOffline,
} from "@/lib/offline-storage";
import type { Track } from "@/types/track";

export function useTrackDownload(track: Track | null) {
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);

  const checkStatus = useCallback(async () => {
    if (!track) return;
    const status = await isTrackDownloaded(track.id);
    setIsDownloaded(status);
  }, [track]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const download = async (quality?: string) => {
    if (!track) return;
    setIsDownloading(true);
    setProgress(10);

    try {
      // 1. Fetch the audio file through our server-side proxy to avoid CORS.
      //    No quality → original/lossless (best for offline).
      const downloadUrl = quality
        ? `/api/tracks/${track.id}/download?quality=${encodeURIComponent(quality)}`
        : `/api/tracks/${track.id}/download`;
      const response = await fetch(downloadUrl);
      if (!response.ok) throw new Error("Failed to fetch track audio");

      const reader = response.body?.getReader();
      const contentLength = +(response.headers.get("Content-Length") ?? 0);

      if (!reader) throw new Error("Could not read response body");

      let receivedLength = 0;
      const chunks = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value);
        receivedLength += value.length;

        if (contentLength) {
          setProgress(Math.round((receivedLength / contentLength) * 90) + 10);
        }
      }

      const blob = new Blob(chunks);

      // 2. Save to native app storage when available so Android Auto can browse it.
      setProgress(95);
      const nativeDownload = await downloadTrackNatively(track, quality);

      // 3. Save to IndexedDB for web/PWA playback and offline UI.
      await saveTrackOffline(track, blob, {
        nativeFileUri: nativeDownload?.fileUri,
        nativeDownloadedAt: nativeDownload?.downloadedAt,
      });

      setIsDownloaded(true);
      toast.success(`Downloaded "${track.title}" for offline playback`);
    } catch (error) {
      console.error("Download error:", error);
      toast.error(`Failed to download "${track.title}"`);
    } finally {
      setIsDownloading(false);
      setProgress(0);
    }
  };

  const remove = async () => {
    if (!track) return;
    try {
      await removeNativeDownload(track.id);
      await removeOfflineTrack(track.id);
      setIsDownloaded(false);
      toast.info(`Removed "${track.title}" from downloads`);
    } catch (error) {
      console.error("Remove error:", error);
      toast.error("Failed to remove track");
    }
  };

  return {
    isDownloaded,
    isDownloading,
    progress,
    download,
    remove,
    refreshStatus: checkStatus,
  };
}
