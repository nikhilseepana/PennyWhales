const CACHE_NAME = 'pennywhales-cache-v2';
const APP_SHELL = [
  '/PennyWhales/',
  '/PennyWhales/index.html',
  '/PennyWhales/manifest.json',
  '/PennyWhales/icon-192.png',
  '/PennyWhales/icon-512.png'
];

function isAppAsset(requestUrl) {
  return (
    requestUrl.pathname.endsWith('.js') ||
    requestUrl.pathname.endsWith('.css') ||
    requestUrl.pathname.endsWith('.html') ||
    requestUrl.pathname.startsWith('/PennyWhales/static/')
  );
}

function isImageAsset(requestUrl) {
  return requestUrl.pathname.match(/\.(png|jpg|jpeg|gif|webp|svg|ico)$/i);
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);

  // For app shell and JS/CSS bundles use network-first to avoid stale cached builds.
  if (isAppAsset(requestUrl) || requestUrl.pathname === '/PennyWhales/' || requestUrl.pathname === '/PennyWhales') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match('/PennyWhales/index.html')))
    );
    return;
  }

  // For images/static media use cache-first.
  if (isImageAsset(requestUrl)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        });
      })
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => response)
      .catch(() => caches.match(event.request))
  );
});
