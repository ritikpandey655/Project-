
const CACHE_NAME = 'pyqverse-v7-core';
const DYNAMIC_CACHE = 'pyqverse-v7-dynamic';

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/offline.html'
];

// Install Event: Cache Core Assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate Event: Cleanup Old Caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== DYNAMIC_CACHE) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. API Requests & Firebase: Network Only (Do not cache)
  if (url.pathname.startsWith('/api/') || url.hostname.includes('firebase') || url.hostname.includes('googleapis')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // 2. Navigation Requests (HTML): Network First, Fallback to Cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // IMPORTANT: ignoreSearch: true ensures /?utm_source=pwa matches /
          return caches.match(event.request, { ignoreSearch: true }).then((cachedRes) => {
            if (cachedRes) return cachedRes;
            // Return index.html for SPA routes, also ignore search params
            return caches.match('/index.html', { ignoreSearch: true }) || caches.match('/offline.html');
          });
        })
    );
    return;
  }

  // 3. Static Assets (Images, JS, CSS): Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // Cache new assets dynamically
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
           const responseToCache = networkResponse.clone();
           caches.open(DYNAMIC_CACHE).then((cache) => {
             cache.put(event.request, responseToCache);
           });
        }
        return networkResponse;
      }).catch(() => {
         // Network failed, nothing to do
      });
      return cachedResponse || fetchPromise;
    })
  );
});
