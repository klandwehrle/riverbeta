/* River Beta — storage and upload logic shared by the app page and the service worker.
   Everything lives in IndexedDB so the service worker can upload in the background (Android). */

var RB = (function () {
  var dbPromise = null;

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      var req = indexedDB.open("river-beta", 1);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains("outbox")) db.createObjectStore("outbox", { keyPath: "id" });
        if (!db.objectStoreNames.contains("kv")) db.createObjectStore("kv");
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
    return dbPromise;
  }

  function run(store, mode, fn) {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(store, mode);
        var req = fn(tx.objectStore(store));
        tx.oncomplete = function () { resolve(req ? req.result : undefined); };
        tx.onerror = function () { reject(tx.error); };
        tx.onabort = function () { reject(tx.error); };
      });
    });
  }

  var db = {
    get: function (store, key) { return run(store, "readonly", function (s) { return s.get(key); }); },
    put: function (store, value, key) {
      return run(store, "readwrite", function (s) { return key === undefined ? s.put(value) : s.put(value, key); });
    },
    del: function (store, key) { return run(store, "readwrite", function (s) { return s.delete(key); }); },
    all: function (store) { return run(store, "readonly", function (s) { return s.getAll(); }); }
  };

  function withTimeout(ms) {
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, ms);
    return { signal: ctrl.signal, done: function () { clearTimeout(timer); } };
  }

  // Apps Script sends a Google sign-in page instead of JSON when the web app isn't shared with "Anyone"
  async function readJson(res) {
    var text = await res.text();
    try { return JSON.parse(text); }
    catch (e) { throw new Error("The sheet didn't answer. Check the web app is deployed with access set to Anyone."); }
  }

  // Sends every queued trip in one request. Trips the server confirms are removed from the outbox.
  // The server skips trip IDs it already has, so retrying after a dropped connection is safe.
  async function uploadOutbox() {
    var config = (await db.get("kv", "config")) || {};
    var settings = (await db.get("kv", "settings")) || {};
    var trips = await db.all("outbox");
    if (!trips.length) return { sent: 0, rejected: [] };
    if (!config.scriptUrl) throw new Error("App isn't connected to a sheet yet.");

    var t = withTimeout(25000);
    try {
      var res = await fetch(config.scriptUrl, {
        method: "POST",
        // text/plain avoids the CORS preflight that Apps Script can't answer
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "addTrips", key: settings.passcode || "", trips: trips }),
        signal: t.signal
      });
      var json = await readJson(res);
      if (!json.ok) throw new Error(json.error || "Upload failed.");
      var done = (json.saved || []).concat((json.rejected || []).map(function (r) { return r.id; }));
      for (var i = 0; i < done.length; i++) await db.del("outbox", done[i]);
      await db.put("kv", new Date().toISOString(), "lastSync");
      return { sent: (json.saved || []).length, rejected: json.rejected || [] };
    } finally {
      t.done();
    }
  }

  return { db: db, uploadOutbox: uploadOutbox, withTimeout: withTimeout, readJson: readJson };
})();
