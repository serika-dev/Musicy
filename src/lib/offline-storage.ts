import { Track } from '@/types/track'

const DB_NAME = 'musicy-offline-db'
const DB_VERSION = 1
const STORE_NAME = 'tracks'

/**
 * Initialize IndexedDB and returns a Promise for the IDBDatabase object
 */
async function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
  })
}

interface OfflineTrack {
  id: string
  metadata: Track
  blob: Blob
  downloadedAt: number
}

/**
 * Saves a track and its audio data to IndexedDB
 */
export async function saveTrackOffline(track: Track, blob: Blob): Promise<void> {
  const db = await initDB()
  const offlineTrack: OfflineTrack = {
    id: track.id,
    metadata: track,
    blob: blob,
    downloadedAt: Date.now()
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.put(offlineTrack)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

/**
 * Retrieves a locally stored track blob
 */
export async function getOfflineTrackBlob(trackId: string): Promise<Blob | null> {
  const db = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.get(trackId)

    request.onsuccess = () => {
      const result = request.result as OfflineTrack | undefined
      resolve(result ? result.blob : null)
    }
    request.onerror = () => reject(request.error)
  })
}

/**
 * Checks if a track is available offline
 */
export async function isTrackDownloaded(trackId: string): Promise<boolean> {
  const db = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.count(trackId)

    request.onsuccess = () => resolve(request.result > 0)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Removes a track from offline storage
 */
export async function removeOfflineTrack(trackId: string): Promise<void> {
  const db = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.delete(trackId)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

/**
 * Returns all downloaded track IDs
 */
export async function getAllDownloadedTrackIds(): Promise<string[]> {
  const db = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.getAllKeys()

    request.onsuccess = () => resolve(request.result as string[])
    request.onerror = () => reject(request.error)
  })
}
