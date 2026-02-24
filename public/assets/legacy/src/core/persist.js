const DB_NAME = 'sqlexplorer';
const STORE = 'sqlite';
const KEY = 'main';

const supported = typeof indexedDB !== 'undefined';

function withStore(mode, fn) {
  if (!supported) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction(STORE, mode);
      const store = tx.objectStore(STORE);
      fn(store, resolve, reject);
      tx.oncomplete = () => db.close();
      tx.onerror = () => reject(tx.error);
    };
  });
}

export async function save(bytes) {
  if (!supported) return;
  await withStore('readwrite', (store, resolve) => {
    store.put(bytes, KEY);
    resolve();
  });
}

export async function load() {
  if (!supported) return null;
  try {
    return await withStore('readonly', (store, resolve, reject) => {
      const req = store.get(KEY);
      req.onsuccess = () => resolve(req.result ? new Uint8Array(req.result) : null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function clear() {
  if (!supported) return;
  await withStore('readwrite', (store, resolve) => {
    store.delete(KEY);
    resolve();
  });
}

export function getStatus() {
  return { supported, store: supported ? STORE : null };
}
