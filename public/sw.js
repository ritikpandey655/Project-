
const CACHE_NAME = 'pyqverse-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      clients.claim(),
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => {
            if (name !== CACHE_NAME) {
              return caches.delete(name);
            }
          })
        );
      })
    ])
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match('/index.html');
        })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache);
            });
        }
        return networkResponse;
      }).catch(() => {});

      return cachedResponse || fetchPromise;
    })
  );
});

// --- SMART NOTIFICATION LOGIC ---
// Handle local messages for scheduled reminders
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SCHEDULE_REMINDER') {
     console.log('⏰ Study Reminder Scheduled for:', event.data.delay / 1000, 'seconds');
     
     // Clear any existing timeouts to reset the timer (simulated via replacement)
     // Note: In a real SW, setTimeout can be killed by the browser. 
     // For robust mobile notifications, 'Notification Triggers API' or Push is needed.
     // This is a best-effort client-side fallback.
     
     setTimeout(() => {
        const title = "Padhai ka Time! 📚";
        const options = {
          body: "Apni streak mat tootne do! 5 minute practice kar lo. 🔥",
          icon: '/icon.svg',
          badge: '/icon.svg',
          vibrate: [100, 50, 100],
          data: { url: '/?action=practice' },
          actions: [
            { action: 'practice', title: 'Start Quiz' },
            { action: 'close', title: 'Later' }
          ]
        };
        
        self.registration.showNotification(title, options);
     }, event.data.delay);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') return;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const urlToOpen = event.notification.data?.url || '/';
      
      // Focus if already open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus().then((c) => {
             return c.navigate ? c.navigate(urlToOpen) : c;
          });
        }
      }
      // Open new if closed
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
