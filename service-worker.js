// MAYND STOMIR — Service Worker

const CACHE_NAME = "maynd-stomir-v20";

// Files to cache for offline access
const ASSETS = [
    "/index.html",
    "/status.html",
    "/freelance.html",
    "/css/styles.css",
    "/css/admin.css",
    "/css/responsive.css",
    "/js/main.js",
    "/js/status.js",
    "/js/nav.js",
    "/js/freelance.js",
    "/icons/icon-192.png",
    "/icons/icon-512.png",
    "/manifest.json"
];

// ── INSTALL — cache all assets ──
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log("Maynd Stomir: caching assets");
            return cache.addAll(ASSETS);
        })
    );
    // Activate immediately without waiting for old SW to finish
    self.skipWaiting();
});

// ── ACTIVATE — clean up old caches ──
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => {
                        console.log("Maynd Stomir: deleting old cache", name);
                        return caches.delete(name);
                    })
            );
        })
    );
    // Take control of all open pages immediately
    self.clients.claim();
});

// ── FETCH — serve from cache, fall back to network ──
self.addEventListener("fetch", (event) => {
    // Skip non-GET requests (POST, PATCH etc go straight to network)
    if (event.request.method !== "GET") return;

    if (!event.request.url.startsWith("http")) return;

    // Skip Supabase and API requests — always go to network for live data
    const url = new URL(event.request.url);
    if (
        url.hostname.includes("supabase.co") ||
        url.hostname.includes("onrender.com") ||
        url.hostname.includes("fonts.googleapis.com") ||
        url.hostname.includes("fonts.gstatic.com") ||
        url.hostname.includes("cdn.jsdelivr.net")
    ) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            // Return cached version if available
            if (cachedResponse) {
                return cachedResponse;
            }
            // Otherwise fetch from network and cache the response
            return fetch(event.request).then((networkResponse) => {
                return caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, networkResponse.clone());
                    return networkResponse;
                });
            });
        }).catch(() => {
            // If both cache and network fail, show offline page
            if (event.request.destination === "document") {
                return caches.match("/index.html");
            }
        })
    );
});
