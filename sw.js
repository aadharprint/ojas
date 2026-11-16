const CACHE_NAME = 'ojas-free-portal-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/pages/portal.html',
  '/pages/verify.html',
  '/manifest.json',
  '/templates/caste.html',
  '/templates/domicile.html',
  '/templates/passport.html',
  '/templates/gazette.html',
  '/templates/annexure-1.html',
  '/templates/annexure-1a.html',
  '/templates/annexure-3.html',
  '/templates/annexure-3a.html',
  '/templates/annexure-b.html',
  '/templates/annexure-c.html',
  '/templates/annexure-d.html',
  '/templates/annexure-e.html',
  '/templates/annexure-f.html'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE).catch(() => {}))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
