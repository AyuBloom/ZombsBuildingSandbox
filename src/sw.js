const CACHE_NAME = "zombs-sandbox-cache-v1";

// Relative URLs to pre-cache (resolved relative to the service worker's location)
const PRECACHE_ASSETS = [
  "index.html",
  "manifest.json",
  "favicon.ico",
  "icon-192.png",
  "icon-512.png",
  "asset/app.css",
  "asset/app.js"
];

// Install Event - Pre-cache core shell assets
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log("[Service Worker] Pre-caching core assets");
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        // Forces the waiting service worker to become the active service worker
        return self.skipWaiting();
      })
  );
});

// Activate Event - Clean up old caches and claim clients immediately
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log("[Service Worker] Removing old cache:", cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      // Let the SW control all open pages/clients immediately
      return self.clients.claim();
    })
  );
});

// Fetch Event - Stale-While-Revalidate caching strategy for GET requests
self.addEventListener("fetch", event => {
  // Only handle GET requests and exclude any chrome-extension or external tracking schemes
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Exclude websocket, non-http, and live reload server requests (e.g. webpack dev server)
  if (!url.protocol.startsWith("http")) return;
  if (url.hostname === "localhost" && url.pathname.includes("webpack-dev-server")) return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // If we have a cached response, return it, but fetch a fresh copy in the background to update cache
      const fetchPromise = fetch(event.request)
        .then(networkResponse => {
          // Verify we received a valid response status
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(err => {
          console.warn("[Service Worker] Background fetch failed for:", event.request.url, err);
        });

      // Stale-While-Revalidate: Return cached response instantly if present, otherwise wait for network
      return cachedResponse || fetchPromise;
    })
  );
});
