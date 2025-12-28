const CACHE_NAME = "pyqverse-v2";
const ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/offline.html",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];

// Install Event
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Caching assets...");
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
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

// Fetch Event (CRITICAL for PWA install prompt)
self.addEventListener("fetch", (event) => {
  // Check if navigation request
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match("/offline.html") || caches.match("/");
      })
    );
    return;
  }

  // Generic assets strategy: Cache First, fallback to Network
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      
      return fetch(event.request).then((networkResponse) => {
        // Only cache successful same-origin responses
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          networkResponse.type === "basic" &&
          !event.request.url.includes("/api/")
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        return null;
      });
    })
  );
});

// Handle local messages for scheduled notifications
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SCHEDULE_REMINDER') {
     setTimeout(() => {
        self.registration.showNotification("Time to Study! 📚", {
          body: "Keep your streak alive. Do a quick 5-min session now.",
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png'
        });
     }, event.data.delay);
  }
});