// MAYND STOMIR — Service Worker (Clean URL Standardized)

const CACHE_NAME = "maynd-stomir-v1.0.7";

// Clean URL precache asset list
const ASSETS = [
    "/",
    "/request",
    "/status",
    "/partners",
    "/login",
    "/admin",
    "/technicians",
    "/invoice",
    "/job-manage",
    "/pricing-terms",
    "/privacy",
    "/css/styles.css",
    "/css/admin.css",
    "/css/privacy.css",
    "/css/responsive.css",
    "/js/main.js",
    "/js/status.js",
    "/js/admin.js",
    "/js/technicians.js",
    "/js/job-manage.js",
    "/js/invoice.js",
    "/js/nav.js",
    "/js/freelance.js",
    "/icons/icon-192.png",
    "/icons/icon-512.png",
    "/manifest.json"
];

// ── INSTALL — Precache all critical clean routes & assets ──
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        }).catch((err) => console.warn("Precache non-critical warning:", err))
    );
    self.skipWaiting();
});

// ── ACTIVATE — Purge old cache generations ──
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

// ── FETCH ──
self.addEventListener("fetch", (event) => {
    if (event.request.method !== "GET") return;
    if (!event.request.url.startsWith("http")) return;

    const url = new URL(event.request.url);

    // Bypass external APIs and CDNs
    if (
        url.hostname.includes("onrender.com") ||
        url.hostname.includes("supabase.co") ||
        url.hostname.includes("fonts.googleapis.com") ||
        url.hostname.includes("fonts.gstatic.com") ||
        url.hostname.includes("cdn.jsdelivr.net")
    ) {
        return;
    }

    const isNavigate = event.request.mode === "navigate" || 
                       (event.request.headers.get("accept") && event.request.headers.get("accept").includes("text/html"));

    // 1. Network-First for HTML navigation requests (Clean URLs)
    if (isNavigate) {
        event.respondWith(
            fetch(event.request)
                .then((networkResponse) => {
                    // Only cache valid, non-redirected 200 responses to prevent auth leaks
                    if (networkResponse && networkResponse.status === 200 && !networkResponse.redirected) {
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseToCache);
                        });
                    }
                    return networkResponse;
                })
                .catch(async () => {
                    // Match the exact clean path ignoring query parameters
                    const cleanPath = url.pathname.replace(/\/$/, "") || "/";
                    const cached = await caches.match(cleanPath, { ignoreSearch: true });
                    if (cached) return cached;
                    
                    // Specific route fallbacks
                    if (cleanPath.startsWith("/admin")) return await caches.match("/admin");
                    if (cleanPath.startsWith("/login")) return await caches.match("/login");
                    if (cleanPath.startsWith("/technicians")) return await caches.match("/technicians");
                    if (cleanPath.startsWith("/status")) return await caches.match("/status");
                    if (cleanPath.startsWith("/invoice")) return await caches.match("/invoice");
                    if (cleanPath.startsWith("/job-manage")) return await caches.match("/job-manage");
                    if (cleanPath.startsWith("/partners")) return await caches.match("/partners");
                    
                    return (await caches.match("/request")) || (await caches.match("/")) || new Response("Offline", { status: 503 });
                })
        );
        return;
    }

    // 2. Cache-First for static assets (CSS, JS, images, icons)
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;

            return fetch(event.request).then((networkResponse) => {
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === "opaque") {
                    return networkResponse;
                }
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });
                return networkResponse;
            }).catch(() => new Response("", { status: 408 }));
        })
    );
});