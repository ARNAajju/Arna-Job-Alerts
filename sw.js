// ==========================================
// ARNA JOB ALERTS
// SERVICE WORKER
// VERSION 2.0.0
// ==========================================

const CACHE_NAME = "arna-job-alerts-v2";

const urlsToCache = [
    "/",
    "/index.html",
    "/offline.html",
    "/style.css",
    "/css/style.css",
    "/manifest.json",
    "/favicon.ico",
    "/favicon.png",
    "/assets/logo.png",
    "/assets/images/no-image.png",
    "/js/firebase.js",
    "/js/firebase-config.js",
    "/js/job-utils.js",
    "/js/script.js",
    "/js/job.js",
    "/js/saved.js",
    "/js/results.js",
    "/js/result-details.js",
    "/js/halltickets.js",
    "/js/hallticket-details.js",
    "/js/schemes.js",
    "/js/scheme-details.js",
    "/job.html",
    "/saved.html",
    "/results.html",
    "/halltickets.html",
    "/schemes.html",
    "/scheme-details.html",
    "/result-details.html",
    "/hallticket-details.html"
];

self.addEventListener("install", (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            )
        )
    );
    self.clients.claim();
});

self.addEventListener("fetch", (event) => {
    if (event.request.method !== "GET") return;

    const url = new URL(event.request.url);

    // Network-first for HTML navigations
    if (event.request.mode === "navigate" || url.pathname.endsWith(".html")) {
        event.respondWith(
            fetch(event.request)
                .then((networkResponse) => {
                    const clone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, clone);
                    });
                    return networkResponse;
                })
                .catch(() =>
                    caches.match(event.request).then((cached) =>
                        cached || caches.match("/offline.html")
                    )
                )
        );
        return;
    }

    // Cache-first for static assets
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;

            return fetch(event.request)
                .then((networkResponse) => {
                    if (
                        !networkResponse ||
                        networkResponse.status !== 200 ||
                        networkResponse.type !== "basic"
                    ) {
                        return networkResponse;
                    }

                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });

                    return networkResponse;
                })
                .catch(() => caches.match("/offline.html"));
        })
    );
});
