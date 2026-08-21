// MAYND STOMIR — Service Worker

const CACHE_NAME = "maynd-stomir-v1.0.5";

// Files to cache for offline access (includes clean URLs and base assets)
const ASSETS = [
    "/",
    "/request",
    "/status",
    "/partners",
    "/css/styles.css",
    "/css/admin.css",
    "/css/privacy.css",
    "/css/responsive.css",
    "/js/main.js",
    "/js/status.js",
    "/js/nav.js",
    "/js/freelance.js",
    "/icons/icon-192.png",
    "/icons/icon-512.png",
    "/manifest.json"
];

// ── INSTALL — cache all assets safely ──
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log("Maynd Stomir: caching assets");
            return cache.addAll(ASSETS);
        }).catch((err) => console.warn("Caching non-critical asset warning:", err))
    );
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
    self.clients.claim();
});

// ── FETCH — serve from cache, fall back to network ──
self.addEventListener("fetch", (event) => {
    // Skip non-GET requests
    if (event.request.method !== "GET") return;
    if (!event.request.url.startsWith("http")) return;

    // Skip external APIs & CDN assets
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
            if (cachedResponse) {
                return cachedResponse;
            }

            return fetch(event.request).then((networkResponse) => {
                // If response is invalid or redirected, return directly without putting into cache
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === "opaque" || networkResponse.redirected) {
                    return networkResponse;
                }

                // Cache valid response safely
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });

                return networkResponse;
            });
        }).catch(() => {
            // Safe fallback ensuring a valid Response is ALWAYS returned
            if (event.request.destination === "document" || event.request.mode === "navigate") {
                return caches.match("/request").then(res => res || caches.match("/") || new Response("Offline", { status: 503 }));
            }
            return new Response("", { status: 408 });
        })
    );
});