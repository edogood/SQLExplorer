var DBPersist = (function () {
  var DB_NAME = "sqlexplorer-db";
  var STORE_NAME = "dbstore";
  var KEY = "current";

  function openDB() {
    return new Promise(function (resolve, reject) {
      var request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = function (e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = function (e) {
        resolve(e.target.result);
      };
      request.onerror = function (e) {
        reject(e.target.error);
      };
    });
  }

  function save(uint8Array) {
    return openDB()
      .then(function (db) {
        return new Promise(function (resolve, reject) {
          var tx = db.transaction(STORE_NAME, "readwrite");
          var store = tx.objectStore(STORE_NAME);
          store.put(uint8Array, KEY);
          tx.oncomplete = function () {
            db.close();
            resolve();
          };
          tx.onerror = function (e) {
            db.close();
            reject(e.target.error);
          };
        });
      })
      .catch(function (err) {
        console.error("DBPersist.save failed:", err);
      });
  }

  function load() {
    return openDB()
      .then(function (db) {
        return new Promise(function (resolve, reject) {
          var tx = db.transaction(STORE_NAME, "readonly");
          var store = tx.objectStore(STORE_NAME);
          var request = store.get(KEY);
          request.onsuccess = function () {
            var data = request.result;
            db.close();
            resolve(data ? new Uint8Array(data) : null);
          };
          request.onerror = function (e) {
            db.close();
            reject(e.target.error);
          };
        });
      })
      .catch(function (err) {
        console.error("DBPersist.load failed:", err);
        return null;
      });
  }

  function clear() {
    return openDB()
      .then(function (db) {
        return new Promise(function (resolve, reject) {
          var tx = db.transaction(STORE_NAME, "readwrite");
          var store = tx.objectStore(STORE_NAME);
          store.delete(KEY);
          tx.oncomplete = function () {
            db.close();
            resolve();
          };
          tx.onerror = function (e) {
            db.close();
            reject(e.target.error);
          };
        });
      })
      .catch(function (err) {
        console.error("DBPersist.clear failed:", err);
      });
  }

  return {
    save: save,
    load: load,
    clear: clear
  };
})();
