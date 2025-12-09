/* ============================================================
   XROT95 ULTIMATE MANUAL — SERVICE WORKER
   Verze: 2.0 (Cache Buster)
============================================================ */

const CACHE_NAME = 'xrot95-cache-v2'; // Změna verze vynutí přenačtení
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './db.js',
  './modules-servicebook.js',
  './modules-xrot-autonomy.js'
];

self.addEventListener('install', event => {
  self.skipWaiting(); // Okamžitá aktivace nového SW
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
  self.clients.claim(); // Převezme kontrolu nad stránkou ihned
});

self.addEventListener('fetch', event => {
  // Strategie: Network First (pro vývoj), fallback to Cache
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
