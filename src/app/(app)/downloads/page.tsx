"use client";

import {
  Download,
  HardDrive,
  Play,
  RefreshCw,
  Smartphone,
  Trash2,
  WifiOff,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/empty-state";
import { TrackListItem } from "@/components/track-list-item";
import { Button } from "@/components/ui/button";
import { useMusicPlayer } from "@/contexts/music-player-context";
import {
  getNativeDownloads,
  type NativeDownloadedTrack,
  nativeDownloadToTrack,
  removeNativeDownload,
} from "@/lib/native-downloads";
import {
  getAllOfflineTracks,
  type OfflineTrackSummary,
  removeOfflineTrack,
} from "@/lib/offline-storage";
import { cn } from "@/lib/utils";
import type { Track } from "@/types/track";

interface DownloadRow {
  id: string;
  track: Track;
  downloadedAt: number;
  sizeBytes: number;
  hasWebCopy: boolean;
  hasNativeCopy: boolean;
}

const DOWNLOAD_SKELETON_ROWS = [
  "download-skeleton-1",
  "download-skeleton-2",
  "download-skeleton-3",
  "download-skeleton-4",
  "download-skeleton-5",
  "download-skeleton-6",
];

function formatBytes(bytes: number) {
  if (!bytes) return "0 MB";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;

  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }

  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function mergeDownloads(
  webTracks: OfflineTrackSummary[],
  nativeTracks: NativeDownloadedTrack[],
): DownloadRow[] {
  const rows = new Map<string, DownloadRow>();

  for (const item of nativeTracks) {
    rows.set(item.id, {
      id: item.id,
      track: nativeDownloadToTrack(item),
      downloadedAt: item.downloadedAt,
      sizeBytes: item.sizeBytes,
      hasWebCopy: false,
      hasNativeCopy: true,
    });
  }

  for (const item of webTracks) {
    const existing = rows.get(item.id);
    rows.set(item.id, {
      id: item.id,
      track: item.metadata,
      downloadedAt: Math.max(item.downloadedAt, existing?.downloadedAt ?? 0),
      sizeBytes: item.sizeBytes || existing?.sizeBytes || 0,
      hasWebCopy: true,
      hasNativeCopy: Boolean(item.nativeFileUri || existing?.hasNativeCopy),
    });
  }

  return Array.from(rows.values()).sort(
    (a, b) => b.downloadedAt - a.downloadedAt,
  );
}

export default function DownloadsPage() {
  const [rows, setRows] = useState<DownloadRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { playTrack, isPlaying, isCurrentTrack } = useMusicPlayer();

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.size += row.sizeBytes;
        if (row.hasNativeCopy) acc.native += 1;
        if (row.hasWebCopy) acc.web += 1;
        return acc;
      },
      { size: 0, native: 0, web: 0 },
    );
  }, [rows]);

  const refreshDownloads = useCallback(async (showSpinner = false) => {
    if (showSpinner) setIsRefreshing(true);
    try {
      const [webTracks, nativeTracks] = await Promise.all([
        getAllOfflineTracks(),
        getNativeDownloads(),
      ]);
      setRows(mergeDownloads(webTracks, nativeTracks));
    } catch (error) {
      console.error("Failed to load downloads:", error);
      toast.error("Failed to load downloads");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    refreshDownloads();

    const handleChange = () => refreshDownloads();
    window.addEventListener("musicy-downloads-changed", handleChange);
    window.addEventListener("online", handleChange);

    return () => {
      window.removeEventListener("musicy-downloads-changed", handleChange);
      window.removeEventListener("online", handleChange);
    };
  }, [refreshDownloads]);

  const handlePlayAll = () => {
    if (!rows.length) return;
    const tracks = rows.map((row) => row.track);
    playTrack(tracks[0], tracks, {
      type: "standalone",
      id: "downloads",
      name: "Downloads",
    });
  };

  const handleRemove = async (row: DownloadRow) => {
    try {
      await Promise.all([
        removeOfflineTrack(row.id),
        removeNativeDownload(row.id),
      ]);
      setRows((current) => current.filter((item) => item.id !== row.id));
      toast.info(`Removed "${row.track.title}" from downloads`);
    } catch (error) {
      console.error("Failed to remove download:", error);
      toast.error("Failed to remove download");
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <section className="relative overflow-hidden rounded-lg border border-white/10 bg-[linear-gradient(135deg,rgba(124,58,237,0.28),rgba(16,185,129,0.16)_42%,rgba(255,255,255,0.05))] px-5 py-7 shadow-2xl sm:px-8 lg:px-10">
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-md border border-white/15 bg-black/30 text-primary shadow-xl backdrop-blur">
              <Download className="h-7 w-7" />
            </div>
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-white/60">
                Library
              </p>
              <h1 className="text-4xl font-black tracking-tight sm:text-6xl">
                Downloads
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70 sm:text-base">
                Your saved tracks stay ready for offline listening and Android
                Auto playback.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center sm:min-w-96">
            <div className="rounded-md border border-white/10 bg-black/25 p-3 backdrop-blur">
              <HardDrive className="mx-auto mb-2 h-4 w-4 text-emerald-300" />
              <div className="text-lg font-black">
                {formatBytes(totals.size)}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-white/50">
                Stored
              </div>
            </div>
            <div className="rounded-md border border-white/10 bg-black/25 p-3 backdrop-blur">
              <WifiOff className="mx-auto mb-2 h-4 w-4 text-cyan-300" />
              <div className="text-lg font-black">{totals.web}</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-white/50">
                Offline
              </div>
            </div>
            <div className="rounded-md border border-white/10 bg-black/25 p-3 backdrop-blur">
              <Smartphone className="mx-auto mb-2 h-4 w-4 text-violet-300" />
              <div className="text-lg font-black">{totals.native}</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-white/50">
                Native
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">
            {rows.length} saved {rows.length === 1 ? "track" : "tracks"}
          </h2>
          <p className="text-sm text-muted-foreground">
            Available even when your connection is not.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshDownloads(true)}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={cn("mr-2 h-4 w-4", isRefreshing && "animate-spin")}
            />
            Refresh
          </Button>
          <Button size="sm" onClick={handlePlayAll} disabled={!rows.length}>
            <Play className="mr-2 h-4 w-4" />
            Play
          </Button>
        </div>
      </div>

      <div className="space-y-1">
        {isLoading ? (
          DOWNLOAD_SKELETON_ROWS.map((key) => (
            <div key={key} className="flex items-center gap-4 rounded-md p-3">
              <div className="h-12 w-12 animate-pulse rounded-md bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
                <div className="h-3 w-1/5 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))
        ) : rows.length ? (
          rows.map((row) => (
            <div
              key={row.id}
              className="group/row flex items-center gap-2 rounded-lg border border-transparent pr-2 transition-colors hover:border-white/10 hover:bg-white/5"
            >
              <div className="min-w-0 flex-1">
                <TrackListItem
                  track={row.track}
                  isPlaying={isCurrentTrack(row.id) && isPlaying}
                  isCurrentTrack={isCurrentTrack(row.id)}
                  onPlay={() => {
                    playTrack(
                      row.track,
                      rows.map((item) => item.track),
                      {
                        type: "standalone",
                        id: "downloads",
                        name: "Downloads",
                      },
                    );
                  }}
                  className="bg-transparent hover:bg-transparent"
                />
              </div>
              <div className="hidden min-w-20 text-right text-xs font-medium text-muted-foreground sm:block">
                {formatBytes(row.sizeBytes)}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground hover:bg-red-500/10 hover:text-red-300"
                onClick={() => handleRemove(row)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        ) : (
          <EmptyState
            icon={<Download />}
            title="No downloads yet"
            description="Save tracks from the player or track menus and they will appear here."
          />
        )}
      </div>
    </div>
  );
}
