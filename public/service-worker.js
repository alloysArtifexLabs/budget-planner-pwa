// Budget Planner PWA Service Worker
const VERSION = 'v1.0.0';
const STATIC_CACHE = `static-${VERSION}`;

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/maskable-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter(k => k !== STATIC_CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // SPA navigations: network first, fall back to cache/offline
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(STATIC_CACHE).then((c) => c.put('/', copy));
        return res;
      }).catch(async () => {
        const cache = await caches.open(STATIC_CACHE);
        return (await cache.match('/')) || (await cache.match('/offline.html'));
      })
    );
    return;
  }

  // Assets: cache first
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        const clone = res.clone();
        caches.open(STATIC_CACHE).then((c) => c.put(req, clone));
        return res;
      }).catch(() => caches.match('/offline.html'));
    })
  );
});
