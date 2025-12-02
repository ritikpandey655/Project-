
// This file is used by PWA Builder to verify Service Worker existence.
// In production, Vite PWA plugin generates a more complex SW.

importScripts('/custom-sw-logic.js');

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});
