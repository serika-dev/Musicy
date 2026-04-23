import type { Track } from "@/types/track";

const DB_NAME = "musicy-offline-db";
const DB_VERSION = 1;
const STORE_NAME = "tracks";

/**
 * Initialize IndexedDB and returns a Promise for the IDBDatabase object
 */
async function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
  });
}

interface OfflineTrack {
  id: string;
  metadata: Track;
  blob: Blob;
  downloadedAt: number;
  sizeBytes?: number;
  nativeFileUri?: string;
  nativeDownloadedAt?: number;
}

export interface OfflineTrackSummary {
  id: string;
  metadata: Track;
  downloadedAt: number;
  sizeBytes: number;
  nativeFileUri?: string;
  nativeDownloadedAt?: number;
}

interface SaveOfflineOptions {
  nativeFileUri?: string;
  nativeDownloadedAt?: number;
}

function notifyDownloadsChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("musicy-downloads-changed"));
}

/**
 * Saves a track and its audio data to IndexedDB
 */
export async function saveTrackOffline(
  track: Track,
  blob: Blob,
  options: SaveOfflineOptions = {},
): Promise<void> {
  const db = await initDB();
  const offlineTrack: OfflineTrack = {
    id: track.id,
    metadata: track,
    blob: blob,
    downloadedAt: Date.now(),
    sizeBytes: blob.size,
    nativeFileUri: options.nativeFileUri,
    nativeDownloadedAt: options.nativeDownloadedAt,
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(offlineTrack);

    request.onsuccess = () => {
      notifyDownloadsChanged();
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Retrieves full locally stored track data
 */
export async function getOfflineTrack(
  trackId: string,
): Promise<OfflineTrack | null> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(trackId);

    request.onsuccess = () => {
      resolve((request.result as OfflineTrack | undefined) ?? null);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Retrieves a locally stored track blob
 */
export async function getOfflineTrackBlob(
  trackId: string,
): Promise<Blob | null> {
  const result = await getOfflineTrack(trackId);
  return result ? result.blob : null;
}

/**
 * Checks if a track is available offline
 */
export async function isTrackDownloaded(trackId: string): Promise<boolean> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.count(trackId);

    request.onsuccess = () => resolve(request.result > 0);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Removes a track from offline storage
 */
export async function removeOfflineTrack(trackId: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(trackId);

    request.onsuccess = () => {
      notifyDownloadsChanged();
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Returns all downloaded track IDs
 */
export async function getAllDownloadedTrackIds(): Promise<string[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAllKeys();

    request.onsuccess = () => resolve(request.result as string[]);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Returns all downloaded tracks without exposing the heavy audio blobs.
 */
export async function getAllOfflineTracks(): Promise<OfflineTrackSummary[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const tracks = (request.result as OfflineTrack[])
        .map((track) => ({
          id: track.id,
          metadata: track.metadata,
          downloadedAt: track.downloadedAt,
          sizeBytes: track.sizeBytes ?? track.blob?.size ?? 0,
          nativeFileUri: track.nativeFileUri,
          nativeDownloadedAt: track.nativeDownloadedAt,
        }))
        .sort((a, b) => b.downloadedAt - a.downloadedAt);

      resolve(tracks);
    };
    request.onerror = () => reject(request.error);
  });
}
