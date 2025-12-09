const CACHE_NAME = 'xrot95-ultimate-v5'; // Změna verze
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './db.js',
  './modules-servicebook.js',
  './modules-xrot-autonomy.js'
];

self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(CORE_ASSETS))); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))))); self.clients.claim(); });
self.addEventListener('fetch', e => e.respondWith(fetch(e.request).catch(() => caches.match(e.request))));
