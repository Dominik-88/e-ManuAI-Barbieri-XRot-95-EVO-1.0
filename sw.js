/* ============================================================
   XROT95 ULTIMATE MANUAL — SERVICE WORKER
   Autor: Barbieri Systems 2025
============================================================ */

const CACHE_NAME = 'xrot95-cache-v1';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './db.js',
  './modules-servicebook.js',
  './modules-xrot-autonomy.js'
];

// Instalace: načtení základních assetů do cache
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Aktivace: odstranění starých verzí cache
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

// Fetch intercept: online-first s fallbackem na cache
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  event.respondWith(
    fetch(req)
      .then(resp => {
        const copy = resp.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, copy));
        return resp;
      })
      .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
  );
});

// Volitelný: zprávy od klientů (např. refresh, version check)
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME);
  }
});