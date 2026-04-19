const CACHE_NAME = 'musicy-v4';
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/liked-songs',
  '/offline',
  '/manifest.json',
  '/icon.svg',
  '/icon.png'
];

// Cache static assets on install
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('Failed to pre-cache some assets:', err);
      });
    })
  );
});

// Clear old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isNextAsset = url.pathname.startsWith('/_next/static/');
  const isImage = url.pathname.match(/\.(png|jpg|jpeg|gif|svg|webp)$/);
  const isFont = url.pathname.match(/\.(woff|woff2|eot|ttf|otf)$/);

  // 1. Navigation requests: Network-first, fall back to cached index
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(url.pathname).then(response => response || caches.match('/')))
    );
    return;
  }

  // 2. Static Assets (Next.js chunks, images, fonts): Stale-While-Revalidate
  if (isNextAsset || isImage || isFont || STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          const fetchedResponse = fetch(event.request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          });

          return cachedResponse || fetchedResponse;
        });
      })
    );
    return;
  }

  // 3. Default: Network only (API, etc.)
});
