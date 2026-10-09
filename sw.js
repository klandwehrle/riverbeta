/* River Beta service worker.
   Bump CACHE_VERSION whenever you change any app file so phones pick up the new version. */
const CACHE_VERSION = "river-beta-v1";
const APP_FILES = [
  "./",
  "./index.html",
  "./config.js",
  "./shared.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png"
];

importScripts("./shared.js");

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_FILES)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// App files: serve from cache instantly (works with no signal), refresh the cache in the background.
// Requests to Google (the sheet) are never intercepted.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.open(CACHE_VERSION).then(async (cache) => {
      const key = req.mode === "navigate" ? "./index.html" : req;
      const cached = await cache.match(key, { ignoreSearch: true });
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok) cache.put(key, res.clone());
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});

// Android/Chrome: upload queued trips even if the app is closed when service returns.
self.addEventListener("sync", (event) => {
  if (event.tag !== "rb-outbox") return;
  event.waitUntil(
    RB.uploadOutbox().then(async () => {
      const clients = await self.clients.matchAll();
      clients.forEach((c) => c.postMessage({ type: "synced" }));
    })
  );
});
