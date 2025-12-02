
// Custom Service Worker logic for Advanced PWA Features

// PWA Builder: Push Notifications
self.addEventListener('push', (event) => {
  let data = { title: 'PYQverse Update', body: 'New study material available.', url: '/' };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/icon.svg',
    badge: '/icon.svg',
    data: data.url || '/',
    vibrate: [100, 50, 100],
    actions: [
      { action: 'open', title: 'Open App' }
    ]
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') return;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const urlToOpen = (event.notification.data && typeof event.notification.data === 'string') 
          ? event.notification.data 
          : (event.notification.data && event.notification.data.url) 
          ? event.notification.data.url 
          : '/';
      
      // If the app is already open, focus it and navigate
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus().then((c) => {
             return c.navigate ? c.navigate(urlToOpen) : c;
          });
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// PWA Builder: Background Sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-user-data') {
    // Logic to sync offline data would go here
    console.log('[SW] Background Sync triggered: sync-user-data');
  }
});

// PWA Builder: Periodic Sync
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'daily-content-update') {
    console.log('[SW] Periodic Sync triggered: daily-content-update');
    // Logic to fetch new questions in background could go here
  }
});
