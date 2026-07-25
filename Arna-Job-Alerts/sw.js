// ==========================================
// ARNA JOB ALERTS
// SERVICE WORKER
// VERSION 1.0.0
// ==========================================

const CACHE_NAME = "arna-job-alerts-v1";

const urlsToCache = [

    "/",
    "/index.html",

    "/style.css",

    "/script.js",
    "/firebase.js",
    "/job.js",
    "/saved.js",
    "/results.js",
    "/halltickets.js",
    "/schemes.js",
    "/scheme-details.js",

    "/job.html",
    "/saved.html",
    "/results.html",
    "/halltickets.html",
    "/schemes.html",
    "/scheme-details.html",

    "/manifest.json",

    "/favicon.ico"

];

// ==========================================
// INSTALL
// ==========================================

self.addEventListener("install", (event) => {

    self.skipWaiting();

    event.waitUntil(

        caches.open(CACHE_NAME)

        .then((cache) => {

            return cache.addAll(urlsToCache);

        })

    );

});

// ==========================================
// ACTIVATE
// ==========================================

self.addEventListener("activate", (event) => {

    event.waitUntil(

        caches.keys()

        .then((keys) => {

            return Promise.all(

                keys.map((key) => {

                    if (key !== CACHE_NAME) {

                        return caches.delete(key);

                    }

                })

            );

        })

    );

    self.clients.claim();

});

// ==========================================
// FETCH
// ==========================================

self.addEventListener("fetch", (event) => {

    if (event.request.method !== "GET") return;

    event.respondWith(

        caches.match(event.request)

        .then((cachedResponse) => {

            if (cachedResponse) {

                return cachedResponse;

            }

            return fetch(event.request)

            .then((networkResponse) => {

                if (

                    !networkResponse ||

                    networkResponse.status !== 200 ||

                    networkResponse.type !== "basic"

                ) {

                    return networkResponse;

                }

                const responseClone =
                    networkResponse.clone();

                caches.open(CACHE_NAME)

                .then((cache) => {

                    cache.put(
                        event.request,
                        responseClone
                    );

                });

                return networkResponse;

            });

        })

        .catch(() => {

            return caches.match("/index.html");

        })

    );

});