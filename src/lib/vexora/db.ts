// IndexedDB storage for imported audio and wallpaper blobs (copies of user files; originals are never touched).
export interface StoredFile {
  blob: Blob;
  name: string;
  type: string;
}
const DB = "vexora-sampler";
const STORE = "files";
let dbp: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (!dbp) {
    dbp = new Promise((res, rej) => {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE);
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  }
  return dbp;
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await open();
  return new Promise((res, rej) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => res(req.result as T);
    req.onerror = () => rej(req.error);
  });
}

export const putFile = (id: string, f: StoredFile) => tx<void>("readwrite", (s) => s.put(f, id));
export const getFile = (id: string) => tx<StoredFile | undefined>("readonly", (s) => s.get(id));
export const delFile = (id: string) => tx<void>("readwrite", (s) => s.delete(id));
export const listFileIds = () => tx<IDBValidKey[]>("readonly", (s) => s.getAllKeys());

export async function requestPersistence() {
  try {
    await navigator.storage?.persist?.();
  } catch {
    /* optional */
  }
}
