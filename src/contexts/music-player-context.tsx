"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { AutoplayWarning } from "@/components/autoplay-warning";
import { WebScrobblerMetadata } from "@/components/web-scrobbler-metadata";
import { type RemoteDevice, useDeviceSync } from "@/hooks/useDeviceSync";
import { useMediaSession } from "@/hooks/useMediaSession";
import { useNativePlayback } from "@/hooks/useNativePlayback";
import { useSettings } from "@/hooks/useSettings";
import { getNativeTrackFileSrc } from "@/lib/native-downloads";
import { getOfflineTrackBlob } from "@/lib/offline-storage";
import type { Track } from "@/types/track";

interface MusicPlayerContextType {
  // Current track state
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;

  // Playback control state
  isRepeat: boolean;
  isShuffle: boolean;
  repeatMode: "off" | "track" | "playlist";
  queue: Track[];
  currentIndex: number;

  // Player actions
  playTrack: (
    track: Track,
    trackList?: Track[],
    context?: {
      type: "playlist" | "album" | "standalone" | "daily-mix";
      id?: string;
      name?: string;
    },
  ) => void;
  togglePlayPause: () => void;
  stopPlayback: () => void;
  seekTo: (seconds: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;

  // Navigation actions
  nextTrack: () => void;
  previousTrack: () => void;
  toggleRepeat: () => void;
  toggleShuffle: () => void;

  // Queue actions
  setQueue: (tracks: Track[], startIndex?: number) => void;

  // Audio element ref for components that need direct access
  audioRef: React.RefObject<HTMLAudioElement | null>;

  // Utility functions
  isCurrentTrack: (trackId: string) => boolean;

  // Multi-device (Spotify Connect-style)
  deviceId: string;
  deviceName: string;
  activeDeviceId: string | null;
  isActiveDevice: boolean;
  devices: RemoteDevice[];
  transferPlayback: (toDeviceId: string) => void;
  claimPlayback: () => void;
  // Same-device multi-tab support
  tabId: string;
  isLeader: boolean;
  tabCount: number;
  shouldPlayAudio: boolean;
  /** Whether the live sync stream to the server is currently open. */
  syncConnected: boolean;

  // Autoplay protection
  isAutoplayBlocked: boolean;
  remoteBlockedDevices: string[];
  clearAutoplayBlock: () => void;
}

const MusicPlayerContext = createContext<MusicPlayerContextType | undefined>(
  undefined,
);

type SyncPublisher = (event: {
  type: string;
  fromDeviceId?: string;
  targetDeviceId?: string;
  payload?: unknown;
}) => void | Promise<void>;

// Utility function to shuffle array
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function MusicPlayerProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const currentTimeRef = useRef(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  // Playback control state
  const [isRepeat, setIsRepeat] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<"off" | "track" | "playlist">(
    "off",
  );

  // Playback context - to know if we're in a playlist/album vs standalone
  const [playbackContext, setPlaybackContext] = useState<{
    type: "playlist" | "album" | "standalone" | "daily-mix" | null;
    id?: string;
    name?: string;
  }>({ type: null });
  const [queue, setQueueState] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  const audioRef = useRef<HTMLAudioElement>(null);
  const shouldAutoPlayRef = useRef<boolean>(false);
  const loadedTrackIdRef = useRef<string | null>(null);
  const loadedObjectUrlRef = useRef<string | null>(null);

  // Multi-device sync state (declared early so effects can reference it)
  const [activeDeviceId, setActiveDeviceId] = useState<string | null>(null);
  const [isAutoplayBlocked, setIsAutoplayBlocked] = useState(false);
  const [remoteBlockedDevices, setRemoteBlockedDevices] = useState<string[]>(
    [],
  );

  const clearLoadedObjectUrl = useCallback(() => {
    if (loadedObjectUrlRef.current) {
      URL.revokeObjectURL(loadedObjectUrlRef.current);
      loadedObjectUrlRef.current = null;
    }
  }, []);
  const deviceIdRef = useRef<string>("");
  const pendingClaimRef = useRef<string | null>(null);
  const isActiveRef = useRef<boolean>(false);
  const handlingRemoteRef = useRef<boolean>(false);
  const tabIdRef = useRef<string>("");
  const isLeaderRef = useRef<boolean>(true);
  const syncPublishRef = useRef<SyncPublisher>(() => {});
  const deviceNameRef = useRef<string>("Unknown");

  // Helper to handle autoplay blocks. The sync refs are assigned after the
  // device-sync hook initializes, but playback effects need these callbacks
  // earlier in the component.
  const handleAutoplayBlock = useCallback(() => {
    setIsAutoplayBlocked(true);
    syncPublishRef.current({
      type: "autoplay-blocked",
      payload: { deviceName: deviceNameRef.current },
    });
  }, []);

  const handleAutoplayResolved = useCallback(() => {
    setIsAutoplayBlocked((wasBlocked) => {
      if (wasBlocked) {
        syncPublishRef.current({
          type: "autoplay-resolved",
          payload: { deviceName: deviceNameRef.current },
        });
      }
      return false;
    });
  }, []);

  // User settings (apply default volume once on hydration)
  const { settings } = useSettings();
  const appliedDefaultVolumeRef = useRef<boolean>(false);
  useEffect(() => {
    if (appliedDefaultVolumeRef.current) return;
    if (typeof settings?.defaultVolume === "number") {
      setVolumeState(settings.defaultVolume);
      setIsMuted(settings.defaultVolume === 0);
      appliedDefaultVolumeRef.current = true;
    }
  }, [settings?.defaultVolume]);

  // Function to fetch recommended tracks
  const fetchRecommendedTracks = useCallback(
    async (currentTrack: Track) => {
      try {
        console.log("🎯 Fetching recommended tracks...");
        const params = new URLSearchParams({
          limit: "10",
          offset: "0",
        });

        // Add genre filter if current track has a genre
        if (currentTrack.genre) {
          params.set("genre", currentTrack.genre);
        }

        const response = await fetch(`/api/tracks?${params}`);
        if (!response.ok) throw new Error("Failed to fetch recommendations");

        const data = await response.json();
        // Filter out the current track and any already in queue
        const recommendations = data.tracks
          .filter(
            (track: Track) =>
              track.id !== currentTrack.id &&
              !queue.find((queueTrack) => queueTrack.id === track.id),
          )
          .slice(0, 5); // Get top 5 recommendations

        console.log("✅ Found recommendations:", recommendations.length);
        return recommendations;
      } catch (error) {
        console.error("❌ Failed to fetch recommendations:", error);
        return [];
      }
    },
    [queue],
  );

  // Helper function for advancing to next track
  const handleNextTrack = useCallback(async () => {
    if (queue.length === 0) return;

    let nextIndex = currentIndex + 1;
    if (nextIndex >= queue.length) {
      // End of queue - decide what to do based on context and repeat mode
      if (
        repeatMode === "playlist" ||
        playbackContext.type === "playlist" ||
        playbackContext.type === "album"
      ) {
        // Loop playlist/album from the start
        console.log("🔄 Looping playlist/album from start");
        nextIndex = 0;
      } else {
        // Standalone playback - fetch recommendations and add to queue
        console.log("🎯 End of queue, fetching recommendations...");
        if (currentTrack) {
          const recommendations = await fetchRecommendedTracks(currentTrack);
          if (recommendations.length > 0) {
            console.log("➕ Adding recommendations to queue");
            const newQueue = [...queue, ...recommendations];
            setQueueState(newQueue);
            // Continue to first recommendation
            nextIndex = queue.length;
            // Update queue length check below
            setCurrentIndex(nextIndex);
            setCurrentTrack(newQueue[nextIndex]);
            setIsPlaying(true);
            shouldAutoPlayRef.current = true; // Mark for auto-play when ready
            return;
          } else {
            console.log("⏹️ No recommendations found, stopping playback");
            return; // No recommendations, stop playback
          }
        } else {
          return; // No current track, stop playback
        }
      }
    }

    // Normal queue navigation
    setCurrentIndex(nextIndex);
    setCurrentTrack(queue[nextIndex]);
    // Explicitly set isPlaying and shouldAutoPlay to ensure continuation
    setIsPlaying(true);
    shouldAutoPlayRef.current = true;
  }, [
    queue,
    currentIndex,
    repeatMode,
    playbackContext,
    currentTrack,
    fetchRecommendedTracks,
  ]);

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      currentTimeRef.current = audio.currentTime;
    };
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => {
      console.log("🔚 Track ended naturally");

      if (repeatMode === "track") {
        // Repeat current track
        console.log("🔁 Repeating current track");
        audio.currentTime = 0;
        setCurrentTime(0);
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch((error) => {
            console.error("❌ Repeat play failed:", error);
            if (error.name === "NotAllowedError") {
              handleAutoplayBlock();
            } else {
              setIsPlaying(false);
            }
          });
        }
        return;
      }

      // Auto-advance to next track if queue exists and not single track repeat
      if (queue.length > 1) {
        // We don't set setIsPlaying(false) here because we want to continue playing the next track
        handleNextTrack();
      } else {
        setIsPlaying(false);
      }
    };
    const handleCanPlay = () => {
      console.log("✅ Track can play");
    };
    const handleError = (e: Event) => {
      const audioError = (e.target as HTMLAudioElement)?.error;
      console.error("❌ Audio error:", {
        code: audioError?.code,
        message: audioError?.message,
        networkState: (e.target as HTMLAudioElement)?.networkState,
        readyState: (e.target as HTMLAudioElement)?.readyState,
      });
      setIsPlaying(false);
    };
    const handlePause = () => {
      console.log("⏸️ Audio paused");
    };
    const handlePlay = () => {
      console.log("▶️ Audio playing");
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("error", handleError);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("play", handlePlay);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("play", handlePlay);
    };
  }, [handleNextTrack, queue.length, repeatMode, handleAutoplayBlock]);

  // Handle track changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!currentTrack) {
      if (audio.src) {
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
      }
      loadedTrackIdRef.current = null;
      clearLoadedObjectUrl();
      return;
    }

    // If we are NOT the active device, never actually play audio locally.
    // The UI will still display the state mirrored from the active device.
    // Also, only the leader tab on the active device plays audio.
    if (activeDeviceId && activeDeviceId !== deviceIdRef.current) {
      if (audio.src) {
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
        loadedTrackIdRef.current = null;
        clearLoadedObjectUrl();
      }
      return;
    }
    // Non-leader tabs don't play audio even on the active device
    if (!isLeaderRef.current) {
      if (audio.src) {
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
        loadedTrackIdRef.current = null;
        clearLoadedObjectUrl();
      }
      return;
    }

    // Skip if src is already set for this track and we're just becoming active again.
    // Track IDs are more reliable than URL matching because offline sources are blob:
    // URLs or Capacitor file URLs.
    if (audio.src && loadedTrackIdRef.current === currentTrack.id) {
      if (Math.abs(audio.currentTime - currentTimeRef.current) > 1) {
        audio.currentTime = currentTimeRef.current;
      }

      if (shouldAutoPlayRef.current) {
        console.log("▶️ Resuming matched source:", currentTrack.title);
        shouldAutoPlayRef.current = false;
        audio.play().catch((error) => {
          console.error("❌ Resume play error:", error);
          if (error.name === "NotAllowedError") {
            handleAutoplayBlock();
          }
        });
      }
      return;
    }

    console.log("🔄 Loading new track:", currentTrack.title);
    console.log("🔗 Track ID:", currentTrack.id);
    console.log("🔗 Audio URL:", currentTrack.filePath);

    // Reset current time immediately
    setCurrentTime(0);

    // Check if track has a valid file path
    if (!currentTrack.filePath) {
      console.error("❌ Track has no file path:", currentTrack.title);
      loadedTrackIdRef.current = null;
      clearLoadedObjectUrl();
      setIsPlaying(false);
      return;
    }

    let cancelled = false;

    // Set new audio source and load with cache-busting parameter
    const loadTrackSource = async () => {
      // Check for native/offline versions before falling back to the network.
      const nativeAudioSrc = await getNativeTrackFileSrc(currentTrack.id);
      const offlineBlob = nativeAudioSrc
        ? null
        : await getOfflineTrackBlob(currentTrack.id);
      if (cancelled) return;

      if (nativeAudioSrc) {
        console.log("📱 Playing from native storage:", currentTrack.title);
        clearLoadedObjectUrl();
        audio.src = nativeAudioSrc;
      } else if (offlineBlob) {
        console.log("📦 Playing from offline storage:", currentTrack.title);
        clearLoadedObjectUrl();
        const objectUrl = URL.createObjectURL(offlineBlob);
        loadedObjectUrlRef.current = objectUrl;
        audio.src = objectUrl;
      } else {
        clearLoadedObjectUrl();
        let audioSrc = currentTrack.filePath;
        if (audioSrc.includes("?")) {
          audioSrc = `${audioSrc}&t=${Date.now()}`;
        } else {
          audioSrc = `${audioSrc}?t=${Date.now()}`;
        }
        audio.src = audioSrc;
        console.log("🌐 Loading track from network:", currentTrack.title);
      }

      loadedTrackIdRef.current = currentTrack.id;

      audio.load();
    };

    loadTrackSource();

    // Add event listener to handle when audio is ready to play
    const handleCanPlay = () => {
      console.log("✅ Audio ready to play (canplay catch)");

      // Safety: Double check that the loaded source still belongs to this track.
      if (loadedTrackIdRef.current !== currentTrack.id) {
        console.warn("⚠️ canplay fired for a stale track source, ignoring.");
        return;
      }

      // If we should be playing, start playing now that audio is ready
      if (shouldAutoPlayRef.current) {
        console.log("▶️ Auto-playing newly loaded track:", currentTrack.title);
        shouldAutoPlayRef.current = false; // Reset the flag
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch((error) => {
            console.error("❌ Auto-play failed:", error);
            if (error.name === "NotAllowedError") {
              handleAutoplayBlock();
            } else if (error.name !== "AbortError") {
              setIsPlaying(false);
            }
          });
        }
      }
      // Remove the event listener as it's only needed once per track load
      audio.removeEventListener("canplay", handleCanPlay);
    };

    audio.addEventListener("canplay", handleCanPlay);

    // Cleanup function to remove event listener if component unmounts or track changes
    return () => {
      cancelled = true;
      audio.removeEventListener("canplay", handleCanPlay);
    };
  }, [currentTrack, activeDeviceId, clearLoadedObjectUrl, handleAutoplayBlock]);

  useEffect(() => {
    return () => clearLoadedObjectUrl();
  }, [clearLoadedObjectUrl]);

  // Handle play/pause changes (for same track toggle, not new track loads)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    // If we are NOT the active device, never actually play audio locally.
    // The UI will still display the state mirrored from the active device.
    // Also, only the leader tab on the active device plays audio.
    if (activeDeviceId && activeDeviceId !== deviceIdRef.current) {
      if (!audio.paused) audio.pause();
      return;
    }
    // Non-leader tabs don't play audio even on the active device
    if (!isLeaderRef.current) {
      if (!audio.paused) audio.pause();
      return;
    }

    if (isPlaying) {
      // Only try to play if the audio source is already loaded and ready
      // This handles resume/play for already loaded tracks
      if (audio.src && audio.readyState >= 2) {
        // HAVE_CURRENT_DATA or better
        // CRITICAL: Ensure the current audio src matches the intended track
        // to avoid playing the old track during a transition race condition.
        if (loadedTrackIdRef.current !== currentTrack.id) {
          console.warn("⏳ isPlaying TRUE but track source is still loading.");
          return;
        }

        console.log("▶️ Resuming/playing current track:", currentTrack.title);
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log("✅ Play/resume successful");
              handleAutoplayResolved();
            })
            .catch((error) => {
              console.error("❌ Play/resume failed:", error);
              if (error.name === "NotAllowedError") {
                handleAutoplayBlock();
              } else if (error.name !== "AbortError") {
                setIsPlaying(false);
              }
            });
        }
      }
      // For newly loaded tracks, play is handled in the canplaythrough event
    } else {
      console.log("⏸️ Pausing...");
      audio.pause();
    }
  }, [
    isPlaying,
    currentTrack,
    activeDeviceId,
    handleAutoplayBlock,
    handleAutoplayResolved,
  ]);

  // Handle volume changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  // ============================================================
  // Multi-device sync (Spotify Connect-style)
  // ============================================================
  // (state declared earlier so effects can read it)

  // Handle incoming sync events (from other devices via SSE)
  const handleSyncEvent = useCallback(
    (event: {
      type: string;
      fromDeviceId?: string;
      targetDeviceId?: string;
      payload?: unknown;
    }) => {
      if (!event.fromDeviceId || event.fromDeviceId === deviceIdRef.current) {
        // ignore our own echoes
        if (event.type !== "device-list" && event.type !== "disconnect") return;
      }

      if (event.type === "autoplay-blocked") {
        const payload = event.payload as { deviceName: string };
        setRemoteBlockedDevices((prev) =>
          prev.includes(payload.deviceName)
            ? prev
            : [...prev, payload.deviceName],
        );
        return;
      }

      if (event.type === "autoplay-resolved") {
        const payload = event.payload as { deviceName: string };
        setRemoteBlockedDevices((prev) =>
          prev.filter((name) => name !== payload.deviceName),
        );
        return;
      }

      if (event.type === "claim") {
        const fromDeviceId = event.fromDeviceId;
        if (!fromDeviceId) return;
        const payload = event.payload as { deviceName: string };
        setActiveDeviceId(fromDeviceId);
        if (fromDeviceId !== deviceIdRef.current) {
          // Another device took over - stop our audio immediately
          const audio = audioRef.current;
          if (audio) {
            audio.pause();
          }
          setIsPlaying(false);
          isActiveRef.current = false;
          console.log(`📻 Playback transferred to "${payload?.deviceName}"`);
        }
        return;
      }

      if (
        event.type === "state" &&
        event.fromDeviceId !== deviceIdRef.current
      ) {
        // We are a controller - mirror the active device's state for display
        const p = event.payload as {
          trackId: string | null;
          currentTrack: Track | null;
          isPlaying: boolean;
          currentTime: number;
          duration: number;
          queue: Track[];
          currentIndex: number;
          activeDeviceId: string;
        };
        handlingRemoteRef.current = true;
        setActiveDeviceId(p.activeDeviceId);
        setIsPlaying(p.isPlaying);
        setCurrentTime(p.currentTime);
        currentTimeRef.current = p.currentTime;
        setDuration(p.duration);
        if (p.currentTrack) setCurrentTrack(p.currentTrack);
        if (Array.isArray(p.queue)) setQueueState(p.queue);
        if (typeof p.currentIndex === "number") setCurrentIndex(p.currentIndex);
        handlingRemoteRef.current = false;
        return;
      }

      if (event.type === "command") {
        const payload = event.payload as {
          action: string;
          seconds?: number;
          volume?: number;
          trackId?: string;
        };

        // Allow remote device to trigger claim directly
        if (
          payload.action === "claim" &&
          event.targetDeviceId === deviceIdRef.current
        ) {
          const id = deviceIdRef.current;
          if (!id) return;

          syncPublishRef.current({
            type: "claim",
            payload: { deviceName: deviceNameRef.current },
          });
          setActiveDeviceId(id);

          if (audioRef.current) {
            if (
              Math.abs(audioRef.current.currentTime - currentTimeRef.current) >
              1
            ) {
              audioRef.current.currentTime = currentTimeRef.current;
            }
          }

          if (isPlaying) {
            shouldAutoPlayRef.current = true;
          }
          return;
        }

        if (!isActiveRef.current) return;

        const audio = audioRef.current;
        switch (payload.action) {
          case "play":
            setIsPlaying(true);
            break;
          case "pause":
            setIsPlaying(false);
            break;
          case "toggle":
            setIsPlaying((prev) => !prev);
            break;
          case "next":
            handleNextTrack();
            break;
          case "previous":
            // previousTrack defined later; replicate inline behavior
            setCurrentIndex((prev) => {
              const prevIndex = prev - 1;
              if (prevIndex < 0) return prev;
              const t = queue[prevIndex];
              if (t) {
                setCurrentTrack(t);
                setIsPlaying(true);
                shouldAutoPlayRef.current = true;
              }
              return prevIndex;
            });
            break;
          case "seek":
            if (audio && typeof payload.seconds === "number") {
              audio.currentTime = payload.seconds;
              setCurrentTime(payload.seconds);
            }
            break;
          case "setVolume":
            if (typeof payload.volume === "number") {
              setVolumeState(payload.volume);
              setIsMuted(payload.volume === 0);
            }
            break;
          case "playTrack": {
            const id = payload.trackId;
            if (!id) break;
            // Fetch full track info and play it
            fetch(`/api/tracks/${id}`)
              .then((r) => (r.ok ? r.json() : null))
              .then((track: Track | null) => {
                if (!track) return;
                setQueueState([track]);
                setCurrentIndex(0);
                setCurrentTrack(track);
                setIsPlaying(true);
                shouldAutoPlayRef.current = true;
              })
              .catch((err) =>
                console.error("Remote playTrack fetch failed:", err),
              );
            break;
          }
          default:
            break;
        }
      }
    },
    [handleNextTrack, isPlaying, queue],
  );

  const {
    deviceId,
    deviceName,
    devices,
    publish: syncPublish,
    connected: syncConnected,
    isLeader,
    tabId,
    tabCount,
  } = useDeviceSync(handleSyncEvent);
  deviceIdRef.current = deviceId;
  deviceNameRef.current = deviceName;
  syncPublishRef.current = syncPublish;
  tabIdRef.current = tabId;
  isLeaderRef.current = isLeader;

  const isActiveDevice = activeDeviceId === deviceId && !!deviceId;
  isActiveRef.current = isActiveDevice;
  // Once an active device is resolved (by us or another device), the in-flight
  // claim guard is cleared so future hand-offs can claim again.
  if (activeDeviceId) pendingClaimRef.current = null;
  // Only leader tab plays audio (prevents multiple tabs playing simultaneously)
  const shouldPlayAudio = isActiveDevice && isLeader;

  // Initialize active device from DB device list when connecting for first time
  useEffect(() => {
    if (!deviceId) return;
    // If no device is currently active across the account, leave it unset until
    // a user action. If a device is active, reflect it.
    const active = devices.find((d) => d.isActive);
    if (active && active.id !== activeDeviceId) {
      setActiveDeviceId(active.id);
    }
  }, [devices, deviceId, activeDeviceId]);

  // Broadcast our state periodically while active
  const currentTrackRef = useRef<Track | null>(null);
  currentTrackRef.current = currentTrack;
  useEffect(() => {
    if (!isActiveDevice || !deviceId) return;
    const broadcast = () => {
      syncPublish({
        type: "state",
        payload: {
          trackId: currentTrackRef.current?.id ?? null,
          currentTrack: currentTrackRef.current,
          isPlaying,
          currentTime,
          duration,
          queue,
          currentIndex,
          activeDeviceId: deviceId,
        },
      });
    };
    // Immediate + interval while playing
    broadcast();
    const interval = window.setInterval(broadcast, 1500);
    // Broadcast immediately when tab becomes visible again (e.g. after
    // background suspension) so other devices get fresh state without
    // waiting up to 1.5s for the next interval tick.
    const onVisible = () => {
      if (document.visibilityState === "visible") broadcast();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [
    isActiveDevice,
    deviceId,
    isPlaying,
    currentTime,
    duration,
    queue,
    currentIndex,
    syncPublish,
  ]);

  const claimPlayback = useCallback(() => {
    if (!deviceId) return;
    syncPublish({
      type: "claim",
      payload: { deviceName },
    });
    setActiveDeviceId(deviceId);

    // When claiming, we immediately want to auto-play so audio resumes,
    // unless we were explicitly paused before.
    if (audioRef.current) {
      if (Math.abs(audioRef.current.currentTime - currentTimeRef.current) > 1) {
        audioRef.current.currentTime = currentTimeRef.current;
      }
    }

    if (isPlaying) {
      shouldAutoPlayRef.current = true;
    }
  }, [deviceId, deviceName, syncPublish, isPlaying]);

  const clearAutoplayBlock = useCallback(() => {
    setIsAutoplayBlocked(false);
    // Try to play again - this call should be triggered by a user interaction
    if (isPlaying && audioRef.current) {
      audioRef.current
        .play()
        .then(() => {
          handleAutoplayResolved();
        })
        .catch((e) => {
          console.error("❌ Retry after interaction failed:", e);
          if (e.name === "NotAllowedError") {
            handleAutoplayBlock();
          }
        });
    }
  }, [isPlaying, handleAutoplayResolved, handleAutoplayBlock]);

  const transferPlayback = useCallback(
    (toDeviceId: string) => {
      if (!deviceId) return;
      // Send one final state broadcast so the target device has the latest
      // position before it claims playback. Without this, the target might
      // use a stale currentTime from up to 2s ago.
      if (isActiveDevice) {
        syncPublish({
          type: "state",
          payload: {
            trackId: currentTrackRef.current?.id ?? null,
            currentTrack: currentTrackRef.current,
            isPlaying,
            currentTime,
            duration,
            queue,
            currentIndex,
            activeDeviceId: deviceId,
          },
        });
      }
      // Directly tell the target device to claim playback
      syncPublish({
        type: "command",
        targetDeviceId: toDeviceId,
        payload: { action: "claim" },
      });
    },
    [deviceId, syncPublish, isActiveDevice, isPlaying, currentTime, duration, queue, currentIndex],
  );

  // React to a dedicated "transfer" command (handled above could be extended)
  // NOTE: simpler path — the settings UI will directly open that device and
  // the user will hit "Play here" there. We surface devices, not remote-claim.

  const playTrackLocal = useCallback(
    (
      track: Track,
      trackList?: Track[],
      context?: {
        type: "playlist" | "album" | "standalone" | "daily-mix";
        id?: string;
        name?: string;
      },
    ) => {
      console.log("🎵 Playing track:", track.title, "by", track.artist.name);
      console.log("🔗 File path:", track.filePath);

      // Set playback context
      if (context) {
        setPlaybackContext(context);
      } else if (trackList && trackList.length > 1) {
        // Infer context from trackList
        setPlaybackContext({ type: "standalone" });
      } else {
        setPlaybackContext({ type: "standalone" });
      }

      // Check system settings for Anonymous Playback and Email Verification
      fetch("/api/settings/public")
        .then((res) => res.json())
        .then((data) => {
          const sys = data.settings || {};
          const allowAnon = sys.ALLOW_ANONYMOUS_PLAYBACK !== "false" && sys.allow_anonymous_playback !== "false";
          const reqEmail = sys.REQUIRE_EMAIL_VERIFICATION === "true" || sys.require_email_verification === "true";

          if (!session?.user && !allowAnon) {
            toast.error("Guest Playback Disabled", {
              description: "Public audio streaming is disabled by system administrator. Please log in to listen.",
              action: {
                label: "Log in",
                onClick: () => { window.location.href = "/login"; },
              },
            });
            return;
          }

          if (session?.user && reqEmail && !(session.user as any)?.emailVerified) {
            toast.error("Email Verification Required", {
              description: "Email verification is required by system administrator before playing tracks.",
            });
            return;
          }
        })
        .catch(() => {});

      // Check if track has a file path (restricted for logged-out users)
      if (!track.filePath) {
        toast.error("Authentication Required", {
          description:
            "Please log in to listen to full tracks and create playlists.",
          action: {
            label: "Log in",
            onClick: () => {
              window.location.href = "/login";
            },
          },
        });
        return;
      }

      if (currentTrack?.id === track.id) {
        // If it's the same track, toggle play/pause
        setIsPlaying(!isPlaying);
      } else {
        // New track - set up queue if provided
        if (trackList && trackList.length > 0) {
          const trackIndex = trackList.findIndex((t) => t.id === track.id);
          if (trackIndex !== -1) {
            if (isShuffle) {
              // Create shuffled queue but ensure current track is at index 0
              const shuffledTracks = shuffleArray([...trackList]);
              const currentTrackInShuffled = shuffledTracks.findIndex(
                (t) => t.id === track.id,
              );
              if (currentTrackInShuffled !== -1) {
                // Swap current track to position 0
                [shuffledTracks[0], shuffledTracks[currentTrackInShuffled]] = [
                  shuffledTracks[currentTrackInShuffled],
                  shuffledTracks[0],
                ];
              }
              setQueueState(shuffledTracks);
              setCurrentIndex(0);
            } else {
              setQueueState(trackList);
              setCurrentIndex(trackIndex);
            }
          }
        } else if (queue.length === 0) {
          // If no queue exists, create a single-track queue
          setQueueState([track]);
          setCurrentIndex(0);
        } else {
          // Update current index in existing queue
          const existingIndex = queue.findIndex((t) => t.id === track.id);
          if (existingIndex !== -1) {
            setCurrentIndex(existingIndex);
          } else {
            // Track not in queue, add it and play
            setQueueState([...queue, track]);
            setCurrentIndex(queue.length);
          }
        }

        setCurrentTrack(track);
        setIsPlaying(true);
        shouldAutoPlayRef.current = true; // Mark for auto-play when ready
      }
    },
    [currentTrack, isPlaying, queue, isShuffle],
  );

  const togglePlayPauseLocal = useCallback(() => {
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const stopPlayback = useCallback(() => {
    setIsPlaying(false);
    setCurrentTrack(null);
  }, []);

  const seekToLocal = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = seconds;
      setCurrentTime(seconds);
    }
  }, []);

  const setVolumeLocal = useCallback((newVolume: number) => {
    setVolumeState(newVolume);
    setIsMuted(newVolume === 0);
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted(!isMuted);
  }, [isMuted]);

  const isCurrentTrack = useCallback(
    (trackId: string) => {
      return currentTrack?.id === trackId;
    },
    [currentTrack],
  );

  // Navigation functions
  const nextTrackLocal = useCallback(() => {
    handleNextTrack();
  }, [handleNextTrack]);

  const previousTrackLocal = useCallback(() => {
    if (queue.length === 0) return;

    // If we're at the beginning, decide what to do based on repeat setting
    let prevIndex = currentIndex - 1;
    if (prevIndex < 0) {
      if (repeatMode === "playlist") {
        prevIndex = queue.length - 1; // Go to last track if playlist repeat is on
      } else {
        return; // Do nothing if no repeat or only track repeat
      }
    }

    setCurrentIndex(prevIndex);
    setCurrentTrack(queue[prevIndex]);
    setIsPlaying(true);
    shouldAutoPlayRef.current = true; // Mark for auto-play when ready
  }, [queue, currentIndex, repeatMode]);

  // -------- Sync-aware public action wrappers --------
  // Any action fires locally if this device is active (or becomes active), else
  // it's sent as a remote command to the active device.

  const ensureActiveDeviceIfNone = useCallback(() => {
    if (activeDeviceId) return activeDeviceId;
    // A claim is already in flight (set synchronously) — don't publish twice.
    // This prevents the double-claim race where rapid actions each fired their
    // own claim before `activeDeviceId` state had updated.
    if (pendingClaimRef.current) return pendingClaimRef.current;
    if (deviceId) {
      pendingClaimRef.current = deviceId;
      syncPublish({ type: "claim", payload: { deviceName } });
      setActiveDeviceId(deviceId);
    }
    return deviceId;
  }, [activeDeviceId, deviceId, deviceName, syncPublish]);

  const playTrack = useCallback<MusicPlayerContextType["playTrack"]>(
    (track, trackList, context) => {
      const target = ensureActiveDeviceIfNone();
      if (target && target !== deviceId) {
        // Forward to active device
        syncPublish({
          type: "command",
          targetDeviceId: target,
          payload: { action: "playTrack", trackId: track.id },
        });
        return;
      }
      playTrackLocal(track, trackList, context);
    },
    [ensureActiveDeviceIfNone, deviceId, syncPublish, playTrackLocal],
  );

  const togglePlayPause = useCallback(() => {
    const target = ensureActiveDeviceIfNone();
    if (target && target !== deviceId) {
      syncPublish({
        type: "command",
        targetDeviceId: target,
        payload: { action: "toggle" },
      });
      return;
    }
    togglePlayPauseLocal();
  }, [ensureActiveDeviceIfNone, deviceId, syncPublish, togglePlayPauseLocal]);

  const seekTo = useCallback(
    (seconds: number) => {
      const target = ensureActiveDeviceIfNone();
      if (target && target !== deviceId) {
        syncPublish({
          type: "command",
          targetDeviceId: target,
          payload: { action: "seek", seconds },
        });
        setCurrentTime(seconds);
        return;
      }
      seekToLocal(seconds);
    },
    [ensureActiveDeviceIfNone, deviceId, syncPublish, seekToLocal],
  );

  const setVolume = useCallback(
    (newVolume: number) => {
      // Volume is device-local by default; only forward if controlling remote
      if (activeDeviceId && activeDeviceId !== deviceId) {
        syncPublish({
          type: "command",
          targetDeviceId: activeDeviceId,
          payload: { action: "setVolume", volume: newVolume },
        });
        setVolumeState(newVolume);
        setIsMuted(newVolume === 0);
        return;
      }
      setVolumeLocal(newVolume);
    },
    [activeDeviceId, deviceId, syncPublish, setVolumeLocal],
  );

  const nextTrack = useCallback(() => {
    const target = ensureActiveDeviceIfNone();
    if (target && target !== deviceId) {
      syncPublish({
        type: "command",
        targetDeviceId: target,
        payload: { action: "next" },
      });
      return;
    }
    nextTrackLocal();
  }, [ensureActiveDeviceIfNone, deviceId, syncPublish, nextTrackLocal]);

  const previousTrack = useCallback(() => {
    const target = ensureActiveDeviceIfNone();
    if (target && target !== deviceId) {
      syncPublish({
        type: "command",
        targetDeviceId: target,
        payload: { action: "previous" },
      });
      return;
    }
    previousTrackLocal();
  }, [ensureActiveDeviceIfNone, deviceId, syncPublish, previousTrackLocal]);

  const toggleRepeat = useCallback(() => {
    const nextMode =
      repeatMode === "off"
        ? "track"
        : repeatMode === "track"
          ? "playlist"
          : "off";
    setRepeatMode(nextMode);
    setIsRepeat(nextMode !== "off");
  }, [repeatMode]);

  const toggleShuffle = useCallback(() => {
    const newShuffleState = !isShuffle;
    setIsShuffle(newShuffleState);

    if (queue.length > 1 && currentTrack) {
      if (newShuffleState) {
        // Enable shuffle - randomize remaining tracks after current
        const currentTrackItem = currentTrack;
        const remainingTracks = queue.slice(currentIndex + 1);
        const previousTracks = queue.slice(0, currentIndex);

        const shuffledRemaining = shuffleArray(remainingTracks);
        const shuffledPrevious = shuffleArray(previousTracks);

        // Rebuild queue: shuffled previous + current + shuffled remaining
        const newQueue = [
          ...shuffledPrevious,
          currentTrackItem,
          ...shuffledRemaining,
        ];

        setQueueState(newQueue);
        setCurrentIndex(shuffledPrevious.length); // Current track position in new queue
      } else {
        // Disable shuffle - keep current order for now
        // In a more advanced implementation, you could restore the original order
        console.log("🔀 Shuffle disabled - keeping current queue order");
      }
    }
  }, [isShuffle, queue, currentTrack, currentIndex]);

  const setQueue = useCallback((tracks: Track[], startIndex: number = 0) => {
    setQueueState(tracks);
    setCurrentIndex(startIndex);
    if (tracks.length > 0 && startIndex < tracks.length) {
      setCurrentTrack(tracks[startIndex]);
      shouldAutoPlayRef.current = true; // Mark for auto-play when ready
    }
  }, []);

  // Media Session API integration for browser controls and notifications
  useMediaSession({
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    onPlay: () => setIsPlaying(true),
    onPause: () => setIsPlaying(false),
    onNextTrack: nextTrack,
    onPreviousTrack: previousTrack,
    onSeekTo: seekTo,
  });

  // Track play tracking: record to listening history + increment playCount
  const lastRecordedTrackIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!currentTrack || !isPlaying) return;
    if (!session?.user?.id) return;
    if (lastRecordedTrackIdRef.current === currentTrack.id) return;

    lastRecordedTrackIdRef.current = currentTrack.id;

    fetch("/api/track/play", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        trackId: currentTrack.id,
        duration: currentTrack.duration,
        context: playbackContext,
      }),
    }).catch((err) => console.error("Failed to record play:", err));
  }, [currentTrack, isPlaying, session?.user?.id, playbackContext]);

  useNativePlayback({
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    queueLength: queue.length,
    currentIndex,
    enabled: shouldPlayAudio,
    onPlay: () => setIsPlaying(true),
    onPause: () => setIsPlaying(false),
    onNextTrack: nextTrack,
    onPreviousTrack: previousTrack,
    onSeekTo: seekTo,
    onStop: stopPlayback,
  });

  const value: MusicPlayerContextType = {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    isRepeat,
    isShuffle,
    repeatMode,
    queue,
    currentIndex,
    playTrack,
    togglePlayPause,
    stopPlayback,
    seekTo,
    setVolume,
    toggleMute,
    nextTrack,
    previousTrack,
    // Sync fields
    deviceId,
    deviceName,
    activeDeviceId,
    isActiveDevice,
    devices,
    transferPlayback,
    claimPlayback,
    // Same-device multi-tab support
    tabId,
    isLeader,
    tabCount,
    shouldPlayAudio,
    syncConnected,
    toggleRepeat,
    toggleShuffle,
    setQueue,
    audioRef,
    isCurrentTrack,
    isAutoplayBlocked,
    remoteBlockedDevices,
    clearAutoplayBlock,
  };

  return (
    <MusicPlayerContext.Provider value={value}>
      {/* Global audio element */}
      <audio ref={audioRef} aria-label="Music player">
        <track kind="captions" />
      </audio>

      {/* Web Scrobbler metadata for Last.fm scrobbling */}
      <WebScrobblerMetadata
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
      />

      <AutoplayWarning />

      {children}
    </MusicPlayerContext.Provider>
  );
}

export function useMusicPlayer() {
  const context = useContext(MusicPlayerContext);
  if (context === undefined) {
    throw new Error("useMusicPlayer must be used within a MusicPlayerProvider");
  }
  return context;
}

export default MusicPlayerContext;
