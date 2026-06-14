/**
 * sw.js - Service Worker for TaskQuest
 *
 * Provides offline-first caching for all core app assets.
 *
 * IMPORTANT: When adding new JS/CSS/HTML files, list them in ASSETS_TO_CACHE
 * so they are available offline after the next install.
 *
 * Cache versioning: bump CACHE_NAME on every deployment that changes static
 * assets so old caches are evicted and users receive fresh files.
 *
 * v2: Fixed asset paths to match the js/ and css/ subdirectory structure.
 *     The v1 cache listed ./style.css, ./script.js, etc. which do not exist
 *     at root level — every install silently 404'd these files, making offline
 *     mode completely non-functional.
 */

const CACHE_NAME = "taskquest-cache-v2";

/**
 * Core assets to pre-cache on service worker install.
 * Paths are relative to the service worker's scope (project root).
 */
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/script.js",
  "./js/storage.js",
  "./js/toast.js",
  "./js/badges.js",
  "./js/analytics.js",
  "./js/sidebar-toggle.js",
  "./js/tabs.js",
  "./js/prioritization.js",
  "./js/fab.js",
  "./js/collab-utils.js",
  "./pages/notes.html",
  "./pages/Challenge.html",
  "./pages/leaderboard.html",
  "./pages/Reflection.html",
  "./pages/focus.html",
  "./pages/docs.html",
  "./pages/faq.html",
  "./pages/privacy.html",
  "./pages/terms.html",
  "./pages/profile.html",
  "./pages/Games.html",
  "./pages/Performance.html",
];

// ---------------------------------------------------------------------------
// Install — pre-cache all static assets
// ---------------------------------------------------------------------------
self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      console.info("[TaskQuest SW] Pre-caching", ASSETS_TO_CACHE.length, "assets...");
      // Pre-caching offline banner resources
      cache.put("/offline-status-check", new Response(JSON.stringify({ offline: true }), { headers: { 'Content-Type': 'application/json' } }));

      // Use individual add() calls via Promise.allSettled so that a single
      // missing or 404 file does not abort the entire install and leave the
      // app permanently unable to work offline.
      return Promise.allSettled(
        ASSETS_TO_CACHE.map(function (url) {
          return cache.add(url).catch(function (err) {
            console.warn("[TaskQuest SW] Failed to pre-cache (will retry on next fetch):", url, err.message);
          });
        })
      );
    }).then(function () {
      // Activate this worker immediately without waiting for old clients to close
      return self.skipWaiting();
    })
  );
});

// ---------------------------------------------------------------------------
// Activate — evict stale caches from previous versions
// ---------------------------------------------------------------------------
self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.map(function (key) {
          if (key !== CACHE_NAME) {
            console.info("[TaskQuest SW] Evicting stale cache:", key);
            return caches.delete(key);
          }
        })
      );
    }).then(function () {
      // Take control of uncontrolled clients immediately
      return self.clients.claim();
    })
  );
});

// ---------------------------------------------------------------------------
// Fetch — Cache-First with Network Fallback
// ---------------------------------------------------------------------------
self.addEventListener("fetch", function (event) {
  // Only intercept GET requests for same-origin resources.
  // Cross-origin requests (CDN fonts, Chart.js, etc.) pass through untouched.
  if (event.request.method !== "GET") return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.match(event.request).then(function (cachedResponse) {
      // Serve from cache if available (offline-first)
      if (cachedResponse) {
        return cachedResponse;
      }

      // Otherwise fetch from network and opportunistically cache the response
      return fetch(event.request).then(function (networkResponse) {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          networkResponse.type === "basic"
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(function () {
        // Offline fallback: serve the shell index.html for navigation requests
        // so the app can boot from cache even without a network connection.
        if (event.request.mode === "navigate") {
          return caches.match("./index.html");
        }
        // For other resource types (images, fonts), return a generic offline response
        return new Response("", { status: 503, statusText: "Service Unavailable" });
      });
    })
  );
});
