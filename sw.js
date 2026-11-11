/**
 * Service Worker for Offline Song Collection & Lyrics Library
 * Network-First Strategy:
 * Always fetches the freshest content from the network when online,
 * updating the local offline cache.
 * Falls back to cache only when offline or network fails.
 */

const CACHE_NAME = 'song-selector-v2';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './404.html',
  './about.html',
  './contact.html',
  './terms.html',
  './privacy.html',
  './styles.css',
  './app.js',
  './mock-backend.js',
  './logo-data.js',
  './songs-data.js',
  './auth-config.js',
  './html2pdf.bundle.min.js',
  './songs.json',
  './manifest.json',
  './images/omkaarssl-logo-transperent-black.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Network-First: Always attempt to fetch from network first so updates are delivered immediately
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Network unavailable or offline: Fallback to cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Fallback for HTML documents when offline
          if (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html')) {
            return caches.match('./index.html');
          }
        });
      })
  );
});
