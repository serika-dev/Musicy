"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  addNativePlaybackActionListener,
  clearNativePlaybackSession,
  updateNativePlaybackSession,
} from "@/lib/native-playback";
import type { Track } from "@/types/track";

interface UseNativePlaybackProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  queueLength: number;
  currentIndex: number;
  enabled: boolean;
  onPlay: () => void;
  onPause: () => void;
  onNextTrack: () => void;
  onPreviousTrack: () => void;
  onSeekTo: (seconds: number) => void;
  onStop: () => void;
}

export function useNativePlayback({
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  queueLength,
  currentIndex,
  enabled,
  onPlay,
  onPause,
  onNextTrack,
  onPreviousTrack,
  onSeekTo,
  onStop,
}: UseNativePlaybackProps) {
  const handlersRef = useRef({
    currentTime,
    duration,
    onPlay,
    onPause,
    onNextTrack,
    onPreviousTrack,
    onSeekTo,
    onStop,
  });

  handlersRef.current = {
    currentTime,
    duration,
    onPlay,
    onPause,
    onNextTrack,
    onPreviousTrack,
    onSeekTo,
    onStop,
  };

  const canSkipNext = queueLength > 1 && currentIndex < queueLength - 1;
  const canSkipPrevious = queueLength > 1 && currentIndex > 0;
  const positionBucket = useMemo(
    () => Math.max(0, Math.floor(currentTime)),
    [currentTime],
  );

  useEffect(() => {
    let listener: Awaited<
      ReturnType<typeof addNativePlaybackActionListener>
    > | null = null;
    let cancelled = false;

    addNativePlaybackActionListener((event) => {
      const handlers = handlersRef.current;

      switch (event.action) {
        case "play":
          handlers.onPlay();
          break;
        case "pause":
          handlers.onPause();
          break;
        case "next":
          handlers.onNextTrack();
          break;
        case "previous":
          handlers.onPreviousTrack();
          break;
        case "seekForward":
          handlers.onSeekTo(
            Math.min(
              handlers.duration || Number.MAX_SAFE_INTEGER,
              handlers.currentTime + 10,
            ),
          );
          break;
        case "seekBackward":
          handlers.onSeekTo(Math.max(0, handlers.currentTime - 10));
          break;
        case "seekTo":
          if (typeof event.positionSeconds === "number") {
            handlers.onSeekTo(event.positionSeconds);
          }
          break;
        case "stop":
          handlers.onStop();
          break;
        default:
          break;
      }
    }).then((handle) => {
      if (cancelled) {
        handle?.remove().catch(() => {});
        return;
      }
      listener = handle;
    });

    return () => {
      cancelled = true;
      listener?.remove().catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (!enabled || !currentTrack) {
      clearNativePlaybackSession().catch(() => {});
      return;
    }

    updateNativePlaybackSession({
      track: currentTrack,
      isPlaying,
      positionSeconds: positionBucket,
      durationSeconds: duration || currentTrack.duration,
      canSkipNext,
      canSkipPrevious,
    }).catch((error) => {
      console.warn("Failed to update native Android playback session.", error);
    });
  }, [
    enabled,
    currentTrack,
    isPlaying,
    positionBucket,
    duration,
    canSkipNext,
    canSkipPrevious,
  ]);

  useEffect(() => {
    return () => {
      clearNativePlaybackSession().catch(() => {});
    };
  }, []);
}
