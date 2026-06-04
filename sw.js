/**
 * sw.js - Service Worker for TaskQuest
 * Provides offline caching capabilities for core assets, scripts, and stylesheets.
 */

const CACHE_NAME = "taskquest-cache-v1";
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./storage.js",
  "./toast.js",
  "./badges.js",
  "./analytics.js",
  "./sidebar-toggle.js",
  "./favicon.png"
];

// Install Event
self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      console.info("[TaskQuest SW] Caching core assets...");
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

// Activate Event
self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.map(function (key) {
          if (key !== CACHE_NAME) {
            console.info("[TaskQuest SW] Clearing old cache:", key);
            return caches.delete(key);
          }
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

// Fetch Event - Cache First with Network Fallback
self.addEventListener("fetch", function (event) {
  // Only handle GET requests
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then(function (cachedResponse) {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then(function (networkResponse) {
        // Cache new resource if valid
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === "basic") {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(function () {
        // Offline fallback if needed (e.g. for HTML)
        if (event.request.mode === "navigate") {
          return caches.match("./index.html");
        }
      });
    })
  );
});
