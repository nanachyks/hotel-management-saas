const CACHE = 'hotelease-v1';
const ASSETS = ['/', '/login', '/index.html'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(clients.claim());
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.origin === location.origin) {
    if (url.pathname.startsWith('/api/')) {
      e.respondWith(
        fetch(e.request).then(r => {
          const clone = r.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return r;
        }).catch(() => caches.match(e.request).then(r => r || new Response(JSON.stringify({ offline: true }), { headers: { 'Content-Type': 'application/json' } })))
      );
    } else {
      e.respondWith(
        fetch(e.request).catch(() => caches.match(e.request).then(r => r || caches.match('/index.html')))
      );
    }
  }
});
