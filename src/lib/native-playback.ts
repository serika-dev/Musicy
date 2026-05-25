"use client";

import {
  Capacitor,
  type Plugin,
  type PluginListenerHandle,
  registerPlugin,
} from "@capacitor/core";
import type { Track } from "@/types/track";

export interface NativePlaybackState {
  track: Track;
  isPlaying: boolean;
  positionSeconds: number;
  durationSeconds: number;
  canSkipNext: boolean;
  canSkipPrevious: boolean;
}

export interface NativePlaybackAction {
  action:
    | "play"
    | "pause"
    | "next"
    | "previous"
    | "seekForward"
    | "seekBackward"
    | "seekTo"
    | "stop";
  positionSeconds?: number;
}

interface MusicyPlaybackPlugin extends Plugin {
  updateSession(options: {
    id: string;
    title: string;
    artist: string;
    album?: string;
    artworkUrl?: string;
    isPlaying: boolean;
    positionSeconds: number;
    durationSeconds: number;
    canSkipNext: boolean;
    canSkipPrevious: boolean;
  }): Promise<void>;
  clearSession(): Promise<void>;
  addListener(
    eventName: "playbackAction",
    listenerFunc: (event: NativePlaybackAction) => void,
  ): Promise<PluginListenerHandle>;
}

const MusicyPlayback = registerPlugin<MusicyPlaybackPlugin>("MusicyPlayback");

export function isNativePlaybackAvailable() {
  return typeof window !== "undefined" && Capacitor.getPlatform() === "android";
}

export async function updateNativePlaybackSession({
  track,
  isPlaying,
  positionSeconds,
  durationSeconds,
  canSkipNext,
  canSkipPrevious,
}: NativePlaybackState) {
  if (!isNativePlaybackAvailable()) return;

  await MusicyPlayback.updateSession({
    id: track.id,
    title: track.title,
    artist: track.artist.name,
    album: track.album?.title,
    artworkUrl: track.coverImageUrl || track.album?.coverImageUrl,
    isPlaying,
    positionSeconds: sanitizeSeconds(positionSeconds),
    durationSeconds: sanitizeSeconds(durationSeconds || track.duration),
    canSkipNext,
    canSkipPrevious,
  });
}

export async function clearNativePlaybackSession() {
  if (!isNativePlaybackAvailable()) return;
  await MusicyPlayback.clearSession();
}

export async function addNativePlaybackActionListener(
  listener: (event: NativePlaybackAction) => void,
) {
  if (!isNativePlaybackAvailable()) return null;
  return MusicyPlayback.addListener("playbackAction", listener);
}

function sanitizeSeconds(value: number) {
  return Number.isFinite(value) && value > 0 ? value : 0;
}
