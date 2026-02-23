(function (global) {
  'use strict';

  const DB_NAME = 'sqlexplorer';
  const STORE = 'sqlite';
  const KEY = 'main';

  function withStore(mode, fn) {
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

  function save(bytes) {
    return withStore('readwrite', (store, resolve) => {
      store.put(bytes, KEY);
      resolve();
    });
  }

  function load() {
    return withStore('readonly', (store, resolve, reject) => {
      const req = store.get(KEY);
      req.onsuccess = () => resolve(req.result ? new Uint8Array(req.result) : null);
      req.onerror = () => reject(req.error);
    }).catch(() => null);
  }

  function clear() {
    return withStore('readwrite', (store, resolve) => {
      store.delete(KEY);
      resolve();
    });
  }

  global.DBPersist = { save, load, clear };
})(window);
