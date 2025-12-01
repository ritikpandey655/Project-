
// Custom Service Worker logic imported by the main SW

// 1. Push Notifications
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'PYQverse Update';
  const options = {
    body: data.body || 'New study material available.',
    icon: '/icon.svg',
    badge: '/icon.svg',
    data: data.url || '/',
    vibrate: [100, 50, 100],
    actions: [
      { action: 'open', title: 'Open App' },
      { action: 'close', title: 'Close' }
    ]
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'close') return;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Open the URL in the notification data
      const urlToOpen = event.notification.data || '/';
      
      for (const client of clientList) {
        // If a window is already open, focus it
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.navigate(urlToOpen).then(c => c.focus());
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// 2. Background Sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-user-data') {
    console.log('[SW] Background Sync triggered: sync-user-data');
    // Logic to sync offline data would go here
  }
});

// 3. Periodic Sync
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'daily-content-update') {
    console.log('[SW] Periodic Sync triggered: daily-content-update');
    // Logic to fetch new content in background
  }
});
