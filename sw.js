/* ============================================================
   XROT95 ULTIMATE MANUAL — SERVICE WORKER
   Verze: 4.0 (Force Reload Fix)
============================================================ */

const CACHE_NAME = 'xrot95-cache-v4';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './db.js',
  './modules-servicebook.js',
  './modules-xrot-autonomy.js'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .then(resp => {
        const copy = resp.clone();
        caches.open(CACHE_NAME).then(c => c.put(event.request, copy));
        return resp;
      })
      .catch(() => caches.match(event.request))
  );
});
