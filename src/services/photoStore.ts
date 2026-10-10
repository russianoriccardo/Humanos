// Scan photos, ONLY when the user opts in ("Keep scan photos on this device"). IndexedDB on this
// device — never localStorage, never uploaded. Every call fails safe: if storage is unavailable
// (private mode, quota), photos simply aren't kept and the app carries on.
const DB_NAME = 'humanos-photos'
const STORE = 'scans'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'))
      return
    }
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb()
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode)
      const request = run(tx.objectStore(STORE))
      tx.oncomplete = () => resolve(request.result)
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

export async function savePhoto(id: string, blob: Blob): Promise<boolean> {
  try {
    await withStore('readwrite', (store) => store.put(blob, id))
    return true
  } catch {
    return false
  }
}

export async function loadPhoto(id: string): Promise<Blob | null> {
  try {
    const result = await withStore<Blob | undefined>('readonly', (store) => store.get(id))
    return result ?? null
  } catch {
    return null
  }
}

export async function photoCount(): Promise<number> {
  try {
    return await withStore('readonly', (store) => store.count())
  } catch {
    return 0
  }
}

// Removes the whole database, so nothing is left behind (used by delete, reset module and reset demo).
export function deleteAllPhotos(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve()
      return
    }
    const request = indexedDB.deleteDatabase(DB_NAME)
    request.onsuccess = request.onerror = request.onblocked = () => resolve()
  })
}
